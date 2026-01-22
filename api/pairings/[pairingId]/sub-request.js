import { z } from "zod";
import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin, requireAuth } from "../../_lib/playhubAuth.js";
import { computeWeekDeadlines, isPast } from "../../_lib/deadlines.js";
import { toDisplayedPr } from "../../_lib/pr.js";

const Body = z
  .object({
    subUserId: z.string().uuid().optional(),
    subEmail: z.string().email().optional(),
    note: z.string().max(2000).optional()
  })
  .refine((v) => v.subUserId || v.subEmail, { message: "Provide subUserId or subEmail" });

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
          teamA: { select: { id: true, captainUserId: true } },
          teamB: { select: { id: true, captainUserId: true } },
          seasonWeek: {
            select: {
              id: true,
              opensAt: true,
              state: true,
              season: {
                select: {
                  id: true,
                  leagueId: true,
                  timezone: true,
                  subDeadlineDow: true,
                  scheduleDeadlineDow: true,
                  resultsDeadlineDow: true,
                  mmrMin: true,
                  mmrMax: true
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

  const admin = await requireAdmin(req, leagueId);
  const isCaptainA = auth.user.id === pairing.matchup.teamA.captainUserId;
  const isCaptainB = auth.user.id === pairing.matchup.teamB.captainUserId;

  if (!admin.ok && !isCaptainA && !isCaptainB) {
    return json(res, 403, { error: "Only captains (of the matchup teams) or admin may request a substitution" });
  }

  if (pairing.matchup.seasonWeek.state !== "OPEN" && !admin.ok) {
    return json(res, 409, { error: "Week is not OPEN" });
  }

  const deadlines = computeWeekDeadlines({
    weekOpensAt: pairing.matchup.seasonWeek.opensAt ?? new Date(),
    timezone: season.timezone,
    subDeadlineDow: season.subDeadlineDow,
    scheduleDeadlineDow: season.scheduleDeadlineDow,
    resultsDeadlineDow: season.resultsDeadlineDow
  });

  if (isPast(deadlines.subDeadlineUtc) && !admin.ok) {
    return json(res, 409, { error: `Sub deadline passed (${deadlines.subDeadlineIso})` });
  }

  // Determine which side is being replaced based on requesting captain
  // Admin can specify note only; we default to replacing the side they control if possible.
  let replacesSide = null;
  if (isCaptainA && !isCaptainB) replacesSide = "A";
  if (isCaptainB && !isCaptainA) replacesSide = "B";
  if (!replacesSide) {
    // Admin or ambiguous (should be rare). Default to A.
    replacesSide = "A";
  }

  const replacesUserId = replacesSide === "A" ? pairing.playerAId : pairing.playerBId;

  const body = Body.parse(await readJson(req));

  let subUserId = body.subUserId;
  if (!subUserId) {
    const user = await prisma.user.findUnique({ where: { email: body.subEmail }, select: { id: true } });
    if (!user) return json(res, 404, { error: `Sub user not found: ${body.subEmail}` });
    subUserId = user.id;
  }

  if (subUserId === replacesUserId) {
    return json(res, 400, { error: "Sub user cannot be the same as replaced user" });
  }

  // Fetch current ratings for rule check (create missing at 250)
  const ensureRating = async (userId) => {
    const existing = await prisma.leagueRating.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
      select: { mmr: true }
    });
    if (existing) return existing.mmr;
    await prisma.leagueRating.create({ data: { leagueId, userId, mmr: 250 } });
    return 250;
  };

  const replacedMmr = await ensureRating(replacesUserId);
  const subMmr = await ensureRating(subUserId);

  const bounds = { min: season.mmrMin ?? 100, max: season.mmrMax ?? 600 };
  const replacedPr = toDisplayedPr(replacedMmr, bounds);
  const subPr = toDisplayedPr(subMmr, bounds);

  if (subPr > replacedPr) {
    return json(res, 400, { error: `Sub PR must be <= replaced player PR (${subPr} > ${replacedPr})` });
  }

  const created = await prisma.substitutionRequest.create({
    data: {
      pairingId,
      seasonId: season.id,
      replacesSide,
      replacesUserId,
      subUserId,
      replacedMmrAtRequest: replacedPr,
      subMmrAtRequest: subPr,
      status: "PENDING",
      requestedByUserId: auth.user.id,
      note: body.note || null
    },
    select: { id: true, status: true, replacesSide: true, replacesUserId: true, subUserId: true, replacedMmrAtRequest: true, subMmrAtRequest: true, requestedAt: true }
  });

  return json(res, 200, { subRequest: created, deadlines });
}