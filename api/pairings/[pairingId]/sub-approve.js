import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/playhubAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const pairingId = req.query?.pairingId;
  if (!pairingId) return json(res, 400, { error: "Missing pairingId" });

  const body = (await readJson(req)) || {};
  const requestId = body.requestId;
  if (!requestId) return json(res, 400, { error: "Missing requestId" });

  const pairing = await prisma.seedPairing.findUnique({
    where: { id: pairingId },
    select: {
      id: true,
      state: true,
      matchup: {
        select: {
          seasonWeek: { select: { state: true, season: { select: { leagueId: true } } } }
        }
      }
    }
  });

  if (!pairing) return json(res, 404, { error: "Pairing not found" });

  const leagueId = pairing.matchup.seasonWeek.season.leagueId;
  const admin = await requireAdmin(req, leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  if (pairing.matchup.seasonWeek.state !== "OPEN") {
    return json(res, 409, { error: "Week is not OPEN" });
  }

  if (pairing.state === "FINAL") {
    return json(res, 409, { error: "Pairing already FINAL" });
  }

  const subReq = await prisma.substitutionRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      pairingId: true,
      status: true,
      replacesSide: true,
      subUserId: true,
      subMmrAtRequest: true
    }
  });

  if (!subReq || subReq.pairingId !== pairingId) return json(res, 404, { error: "Sub request not found for pairing" });
  if (subReq.status !== "PENDING") return json(res, 409, { error: `Sub request is not PENDING (${subReq.status})` });

  const updatePairing =
    subReq.replacesSide === "A"
      ? { playerAId: subReq.subUserId, mmrAAtCreate: subReq.subMmrAtRequest }
      : { playerBId: subReq.subUserId, mmrBAtCreate: subReq.subMmrAtRequest };

  const result = await prisma.$transaction(async (tx) => {
    const pairingUpdated = await tx.seedPairing.update({
      where: { id: pairingId },
      data: updatePairing,
      select: { id: true, playerAId: true, playerBId: true }
    });

    const reqUpdated = await tx.substitutionRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", decidedByUserId: admin.user.id, decidedAt: new Date() },
      select: { id: true, status: true }
    });

    // Reject any other pending requests for same pairing
    await tx.substitutionRequest.updateMany({
      where: { pairingId, status: "PENDING", id: { not: requestId } },
      data: { status: "REJECTED", decidedByUserId: admin.user.id, decidedAt: new Date(), note: "Auto-rejected (another request approved)" }
    });

    return { pairing: pairingUpdated, subRequest: reqUpdated };
  });

  return json(res, 200, { ok: true, ...result });
}