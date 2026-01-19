import { prisma } from "../../_lib/db.js";
import { json } from "../../_lib/http.js";
import { requireAdmin, requireAuth } from "../../_lib/playhubAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const pairingId = req.query?.pairingId;
  if (!pairingId) return json(res, 400, { error: "Missing pairingId" });

  const auth = await requireAuth(req);
  if (!auth.ok) return json(res, auth.status, { error: auth.error });

  const pairing = await prisma.seedPairing.findUnique({
    where: { id: pairingId },
    select: {
      id: true,
      playerAId: true,
      playerBId: true,
      gamesWonA: true,
      gamesWonB: true,
      reportedByUserId: true,
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
  const weekState = pairing.matchup.seasonWeek.state;

  const isPlayer = auth.user.id === pairing.playerAId || auth.user.id === pairing.playerBId;
  const admin = await requireAdmin(req, leagueId);
  if (!isPlayer && !admin.ok) return json(res, 403, { error: "Forbidden" });

  if (weekState !== "OPEN" && !admin.ok) {
    return json(res, 409, { error: "Week is not open" });
  }

  if (!pairing.reportedByUserId) return json(res, 400, { error: "No result reported yet" });

  const callerIsOpponent = auth.user.id !== pairing.reportedByUserId;
  if (!callerIsOpponent && !admin.ok) return json(res, 400, { error: "Reporter cannot confirm their own result" });

  const next = await prisma.seedPairing.update({
    where: { id: pairingId },
    data: {
      confirmedByOpponent: true,
      state: "FINAL"
    },
    select: {
      id: true,
      state: true,
      confirmedByOpponent: true
    }
  });

  return json(res, 200, { pairing: next });
}