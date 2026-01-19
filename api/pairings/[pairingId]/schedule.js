import { z } from "zod";
import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin, requireAuth } from "../../_lib/playhubAuth.js";
import { computeWeekDeadlines, isPast } from "../../_lib/deadlines.js";

const Body = z.object({
  scheduledFor: z.string().datetime().optional(),
  confirm: z.boolean().optional()
});

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
      scheduleConfirmedByA: true,
      scheduleConfirmedByB: true,
      scheduledFor: true,
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

  const weekState = pairing.matchup.seasonWeek.state;
  const season = pairing.matchup.seasonWeek.season;
  const leagueId = season.leagueId;

  const isPlayer = auth.user.id === pairing.playerAId || auth.user.id === pairing.playerBId;
  const admin = await requireAdmin(req, leagueId);
  if (!isPlayer && !admin.ok) return json(res, 403, { error: "Forbidden" });

  if (pairing.state === "FINAL" && !admin.ok) {
    return json(res, 409, { error: "Pairing already finalized" });
  }

  if (weekState !== "OPEN" && !admin.ok) {
    return json(res, 409, { error: "Week is not open for scheduling" });
  }

  const deadlines = computeWeekDeadlines({
    weekOpensAt: pairing.matchup.seasonWeek.opensAt ?? new Date(),
    timezone: season.timezone,
    subDeadlineDow: season.subDeadlineDow,
    scheduleDeadlineDow: season.scheduleDeadlineDow,
    resultsDeadlineDow: season.resultsDeadlineDow
  });

  if (isPast(deadlines.scheduleDeadlineUtc) && !admin.ok) {
    return json(res, 409, { error: `Schedule deadline passed (${deadlines.scheduleDeadlineIso})` });
  }

  const body = Body.parse((await readJson(req)) || {});

  const callerIsA = auth.user.id === pairing.playerAId;
  const callerIsB = auth.user.id === pairing.playerBId;

  const update = {};
  if (body.scheduledFor) {
    update.scheduledFor = new Date(body.scheduledFor);
    update.scheduleProposedByUserId = auth.user.id;
    if (callerIsA) update.scheduleConfirmedByA = true;
    if (callerIsB) update.scheduleConfirmedByB = true;
  }

  if (body.confirm) {
    if (callerIsA) update.scheduleConfirmedByA = true;
    if (callerIsB) update.scheduleConfirmedByB = true;
  }

  const next = await prisma.seedPairing.update({
    where: { id: pairingId },
    data: {
      ...update,
      state:
        (update.scheduleConfirmedByA ?? pairing.scheduleConfirmedByA) &&
        (update.scheduleConfirmedByB ?? pairing.scheduleConfirmedByB)
          ? "SCHEDULED"
          : undefined
    },
    select: {
      id: true,
      state: true,
      scheduledFor: true,
      scheduleProposedByUserId: true,
      scheduleConfirmedByA: true,
      scheduleConfirmedByB: true
    }
  });

  return json(res, 200, { pairing: next, deadlines });
}