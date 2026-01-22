import { z } from "zod";
import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/playhubAuth.js";
import { getPrimaryLeague } from "../../_lib/singleLeague.js";

const Body = z
  .object({
    userId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    hiddenPr: z.number().int().min(0).max(5000)
  })
  .refine((v) => v.userId || v.email, { message: "Provide userId or email" });

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return json(res, 204, {});
  }
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const league = await getPrimaryLeague();
  if (!league) return json(res, 404, { error: "No league found" });

  const admin = await requireAdmin(req, league.id);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const body = Body.parse(await readJson(req));

  let userId = body.userId;
  if (!userId) {
    const user = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (!user) return json(res, 404, { error: `User not found: ${body.email}` });
    userId = user.id;
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.leagueRating.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId } },
      select: { mmr: true }
    });

    const before = existing?.mmr ?? 250;

    await tx.leagueRating.upsert({
      where: { leagueId_userId: { leagueId: league.id, userId } },
      update: { mmr: body.hiddenPr },
      create: { leagueId: league.id, userId, mmr: body.hiddenPr }
    });

    await tx.mMREvent.create({
      data: {
        leagueId: league.id,
        userId,
        type: "INITIAL_RATING",
        delta: body.hiddenPr - before,
        mmrBefore: before,
        mmrAfter: body.hiddenPr,
        reason: "Initial PR set"
      }
    });

    return { userId, hiddenPr: body.hiddenPr, before };
  });

  return json(res, 200, { ok: true, ...result });
}

