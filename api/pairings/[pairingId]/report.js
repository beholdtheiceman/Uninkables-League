import { z } from "zod";
import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin, requireAuth } from "../../_lib/playhubAuth.js";

const Body = z.object({
  gamesWonA: z.number().int().min(0).max(3),
  gamesWonB: z.number().int().min(0).max(3)
});

function isValidBestOf3(a, b) {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  return max === 2 && (min === 0 || min === 1);
}

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
      confirmedByOpponent: true,
      matchup: {
        select: {
          seasonWeek: {
            select: {
              state: true,
              season: { select: { leagueId: true } }
            }
          }
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
    return json(res, 409, { error: "Week is not open for reporting" });
  }

  const body = Body.parse(await readJson(req));
  if (!isValidBestOf3(body.gamesWonA, body.gamesWonB)) {
    return json(res, 400, { error: "Invalid score. Expected best-of-3 result (2-0 or 2-1)." });
  }

  const existing = { a: pairing.gamesWonA, b: pairing.gamesWonB };
  const sameAsExisting = existing.a === body.gamesWonA && existing.b === body.gamesWonB;

  let nextState = "REPORTED";
  if (pairing.reportedByUserId && !sameAsExisting) {
    nextState = "DISPUTED";
  }

  const next = await prisma.seedPairing.update({
    where: { id: pairingId },
    data: {
      gamesWonA: body.gamesWonA,
      gamesWonB: body.gamesWonB,
      reportedByUserId: auth.user.id,
      reportedAt: new Date(),
      confirmedByOpponent: false,
      state: nextState
    },
    select: {
      id: true,
      state: true,
      gamesWonA: true,
      gamesWonB: true,
      reportedByUserId: true,
      reportedAt: true,
      confirmedByOpponent: true
    }
  });

  return json(res, 200, { pairing: next });
}