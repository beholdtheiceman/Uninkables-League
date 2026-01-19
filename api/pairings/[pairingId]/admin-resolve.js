import { z } from "zod";
import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/playhubAuth.js";

const Body = z
  .object({
    gamesWonA: z.number().int().min(0).max(2).optional(),
    gamesWonB: z.number().int().min(0).max(2).optional(),
    winner: z.enum(["A", "B"]).optional()
  })
  .refine(
    (v) =>
      (typeof v.gamesWonA === "number" && typeof v.gamesWonB === "number") || typeof v.winner === "string",
    { message: "Provide gamesWonA+gamesWonB or winner" }
  );

function normalizeScore(body) {
  if (typeof body.gamesWonA === "number" && typeof body.gamesWonB === "number") {
    return { gamesWonA: body.gamesWonA, gamesWonB: body.gamesWonB };
  }
  return body.winner === "A" ? { gamesWonA: 2, gamesWonB: 0 } : { gamesWonA: 0, gamesWonB: 2 };
}

function isValidBestOf3(a, b) {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  return max === 2 && (min === 0 || min === 1);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const pairingId = req.query?.pairingId;
  if (!pairingId) return json(res, 400, { error: "Missing pairingId" });

  const pairing = await prisma.seedPairing.findUnique({
    where: { id: pairingId },
    select: {
      id: true,
      matchup: {
        select: {
          seasonWeek: {
            select: { state: true, season: { select: { leagueId: true } } }
          }
        }
      }
    }
  });

  if (!pairing) return json(res, 404, { error: "Pairing not found" });

  const leagueId = pairing.matchup.seasonWeek.season.leagueId;
  const admin = await requireAdmin(req, leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  if (pairing.matchup.seasonWeek.state === "FINAL") {
    return json(res, 409, { error: "Week already finalized" });
  }

  const body = Body.parse(await readJson(req));
  const score = normalizeScore(body);

  if (!isValidBestOf3(score.gamesWonA, score.gamesWonB)) {
    return json(res, 400, { error: "Invalid score. Expected 2-0 or 2-1." });
  }

  const next = await prisma.seedPairing.update({
    where: { id: pairingId },
    data: {
      gamesWonA: score.gamesWonA,
      gamesWonB: score.gamesWonB,
      reportedByUserId: admin.user.id,
      reportedAt: new Date(),
      confirmedByOpponent: true,
      state: "FINAL"
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