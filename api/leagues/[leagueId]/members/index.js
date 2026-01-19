import { z } from "zod";
import { prisma } from "../../../_lib/db.js";
import { json, readJson } from "../../../_lib/http.js";
import { requireAdmin } from "../../../_lib/playhubAuth.js";

const Body = z.object({
  userId: z.string().uuid(),
  role: z.enum(["PLAYER", "CAPTAIN", "ADMIN"]).default("PLAYER")
});

export default async function handler(req, res) {
  const leagueId = req.query?.leagueId;
  if (!leagueId) return json(res, 400, { error: "Missing leagueId" });

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const admin = await requireAdmin(req, leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const body = Body.parse(await readJson(req));

  const member = await prisma.leagueMember.upsert({
    where: { leagueId_userId: { leagueId, userId: body.userId } },
    create: { leagueId, userId: body.userId, role: body.role },
    update: { role: body.role },
    select: { id: true, leagueId: true, userId: true, role: true, joinedAt: true }
  });

  return json(res, 200, { member });
}