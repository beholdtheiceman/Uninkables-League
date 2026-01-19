import { z } from "zod";
import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin, requireAuth } from "../../_lib/playhubAuth.js";
import { computeWeekDeadlines, isPast } from "../../_lib/deadlines.js";

const Body = z
  .object({
    note: z.string().max(2000).optional()
  })
  .optional();

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

  const isPlayer = auth.user.id === pairing.playerAId || auth.user.id === pairing.playerBId;
  const admin = await requireAdmin(req, leagueId);
  if (!isPlayer && !admin.ok) return json(res, 403, { error: "Forbidden" });

  if (pairing.state === "FINAL" && !admin.ok) {
    return json(res, 409, { error: "Pairing already finalized" });
  }

  if (pairing.matchup.seasonWeek.state !== "OPEN" && !admin.ok) {
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

  // Note is accepted but not persisted yet (no field in schema on pairing). We'll persist it on SubstitutionRequest, etc.
  Body?.parse(await readJson(req));

  const next = await prisma.seedPairing.update({
    where: { id: pairingId },
    data: { state: "DISPUTED" },
    select: { id: true, state: true }
  });

  return json(res, 200, { pairing: next, deadlines });
}