import { z } from "zod";
import { prisma } from "../../../_lib/db.js";
import { json, readJson } from "../../../_lib/http.js";
import { requireAdmin } from "../../../_lib/playhubAuth.js";

const Body = z
  .object({
    userId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    role: z.enum(["PLAYER", "CAPTAIN", "ADMIN"]).default("PLAYER")
  })
  .refine((v) => v.userId || v.email, { message: "Provide userId or email" });

export default async function handler(req, res) {
  const leagueId = req.query?.leagueId;
  if (!leagueId) return json(res, 400, { error: "Missing leagueId" });

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const admin = await requireAdmin(req, leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const body = Body.parse(await readJson(req));

  let userId = body.userId;
  if (!userId) {
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true }
    });
    if (!user) return json(res, 404, { error: "User not found" });
    userId = user.id;
  }

  const member = await prisma.leagueMember.upsert({
    where: { leagueId_userId: { leagueId, userId } },
    create: { leagueId, userId, role: body.role },
    update: { role: body.role },
    select: { id: true, leagueId: true, userId: true, role: true, joinedAt: true }
  });

  return json(res, 200, { member });
}