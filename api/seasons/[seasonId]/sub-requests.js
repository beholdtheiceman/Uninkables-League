import { prisma } from "../../_lib/db.js";
import { json } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/playhubAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const seasonId = req.query?.seasonId;
  if (!seasonId) return json(res, 400, { error: "Missing seasonId" });

  const season = await prisma.season.findUnique({ where: { id: seasonId }, select: { id: true, leagueId: true } });
  if (!season) return json(res, 404, { error: "Season not found" });

  const admin = await requireAdmin(req, season.leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const requests = await prisma.substitutionRequest.findMany({
    where: { seasonId },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      pairingId: true,
      status: true,
      replacesSide: true,
      replacedMmrAtRequest: true,
      subMmrAtRequest: true,
      note: true,
      requestedAt: true,
      decidedAt: true,
      requestedBy: { select: { email: true } },
      subUser: { select: { email: true } },
      replacesUser: { select: { email: true } }
    }
  });

  return json(res, 200, { requests });
}