import { prisma } from "../../_lib/db.js";
import { json } from "../../_lib/http.js";
import { requireAdmin, requireAuth } from "../../_lib/playhubAuth.js";
import { computeWeekDeadlines, isPast } from "../../_lib/deadlines.js";

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
      state: true,
      playerAId: true,
      playerBId: true,
      reportedByUserId: true,
      matchup: {
        select: {
          seasonWeek: {
            select: {
              opensAt: true,
              state: true,
              season: {
                select: {
                  leagueId: true,
                  timezone: true,
                  subDeadlineDow: true,
                  scheduleDeadlineDow: true,
                  resultsDeadlineDow: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!pairing) return json(res, 404, { error: "Pairing not found" });

  const season = pairing.matchup.seasonWeek.season;
  const leagueId = season.leagueId;
  const weekState = pairing.matchup.seasonWeek.state;

  const isPlayer = auth.user.id === pairing.playerAId || auth.user.id === pairing.playerBId;
  const admin = await requireAdmin(req, leagueId);
  if (!isPlayer && !admin.ok) return json(res, 403, { error: "Forbidden" });

  if (pairing.state === "FINAL") return json(res, 409, { error: "Pairing already FINAL" });

  if (weekState !== "OPEN" && !admin.ok) {
    return json(res, 409, { error: "Week is not open" });
  }

  const deadlines = computeWeekDeadlines({
    weekOpensAt: pairing.matchup.seasonWeek.opensAt ?? new Date(),
    timezone: season.timezone,
    subDeadlineDow: season.subDeadlineDow,
    scheduleDeadlineDow: season.scheduleDeadlineDow,
    resultsDeadlineDow: season.resultsDeadlineDow
  });

  if (isPast(deadlines.resultsDeadlineUtc) && !admin.ok) {
    return json(res, 409, { error: `Results deadline passed (${deadlines.resultsDeadlineIso})` });
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

  return json(res, 200, { pairing: next, deadlines });
}