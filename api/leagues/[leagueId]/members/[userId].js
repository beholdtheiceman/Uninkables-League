import { z } from "zod";
import { prisma } from "../../../../_lib/db.js";
import { json, readJson } from "../../../../_lib/http.js";
import { requireAdmin } from "../../../../_lib/playhubAuth.js";

const Body = z.object({
  role: z.enum(["PLAYER", "CAPTAIN", "ADMIN"])
});

export default async function handler(req, res) {
  const leagueId = req.query?.leagueId;
  const userId = req.query?.userId;
  if (!leagueId) return json(res, 400, { error: "Missing leagueId" });
  if (!userId) return json(res, 400, { error: "Missing userId" });

  if (req.method !== "PATCH") return json(res, 405, { error: "Method not allowed" });

  const admin = await requireAdmin(req, leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const body = Body.parse(await readJson(req));

  const member = await prisma.leagueMember.update({
    where: { leagueId_userId: { leagueId, userId } },
    data: { role: body.role },
    select: { id: true, leagueId: true, userId: true, role: true, joinedAt: true }
  });

  return json(res, 200, { member });
}