import { prisma } from "../../../_lib/db.js";
import { json, readJson } from "../../../_lib/http.js";
import { requireAdmin } from "../../../_lib/playhubAuth.js";
import { roundRobinWeeks } from "../../../_lib/playhubSchedule.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const seasonId = req.query?.seasonId;
  if (!seasonId) return json(res, 400, { error: "Missing seasonId" });

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: {
      id: true,
      leagueId: true,
      rosterSize: true,
      regularWeeks: true
    }
  });
  if (!season) return json(res, 404, { error: "Season not found" });

  const admin = await requireAdmin(req, season.leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const body = (await readJson(req)) || {};
  const overwrite = Boolean(body.overwrite);

  // Require approved rosters (mmrAtLock present)
  const teams = await prisma.seasonTeam.findMany({
    where: { seasonId, rosterApprovedAt: { not: null } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      rosterSlots: {
        orderBy: { slotIndex: "asc" },
        select: { slotIndex: true, userId: true, mmrAtLock: true, isActive: true }
      }
    }
  });

  const eligible = teams.filter((t) => {
    const active = t.rosterSlots.filter((s) => s.isActive);
    if (active.length !== season.rosterSize) return false;
    return active.every((s) => typeof s.mmrAtLock === "number");
  });

  if (eligible.length < 2) {
    return json(res, 400, {
      error: "Need at least 2 teams with approved rosters (mmrAtLock set) to generate schedule",
      eligibleTeams: eligible.length
    });
  }

  // build round robin weeks
  const rr = roundRobinWeeks(eligible.map((t) => t.id));
  const weeksToCreate = Math.min(season.regularWeeks, rr.length);

  const rosterByTeam = new Map(eligible.map((t) => [t.id, t.rosterSlots.filter((s) => s.isActive).sort((a, b) => a.slotIndex - b.slotIndex)]));

  const result = await prisma.$transaction(async (tx) => {
    if (overwrite) {
      // Delete all weeks/matchups/pairings for this season
      await tx.seedPairing.deleteMany({ where: { matchup: { seasonWeek: { seasonId } } } });
      await tx.weekMatchup.deleteMany({ where: { seasonWeek: { seasonId } } });
      await tx.seasonWeek.deleteMany({ where: { seasonId } });
    } else {
      // If any weeks already exist, refuse (to prevent accidental duplication)
      const existing = await tx.seasonWeek.count({ where: { seasonId } });
      if (existing > 0) {
        throw new Error("Weeks already exist for this season. Re-run with { overwrite: true } to replace.");
      }
    }

    let matchupCount = 0;
    let pairingCount = 0;

    for (let i = 0; i < weeksToCreate; i++) {
      const weekIndex = i + 1;
      const pairs = rr[i];

      const week = await tx.seasonWeek.create({
        data: {
          seasonId,
          weekIndex,
          type: "REGULAR",
          state: "DRAFT",
          opensAt: null,
          locksAt: null
        },
        select: { id: true }
      });

      for (const [teamAId, teamBId] of pairs) {
        const matchup = await tx.weekMatchup.create({
          data: {
            seasonWeekId: week.id,
            teamAId,
            teamBId,
            state: "DRAFT"
          },
          select: { id: true }
        });
        matchupCount++;

        const slotsA = rosterByTeam.get(teamAId);
        const slotsB = rosterByTeam.get(teamBId);

        for (let seed = 1; seed <= season.rosterSize; seed++) {
          const sa = slotsA[seed - 1];
          const sb = slotsB[seed - 1];
          await tx.seedPairing.create({
            data: {
              matchupId: matchup.id,
              seedIndex: seed,
              state: "PENDING_SCHEDULE",
              playerAId: sa.userId,
              playerBId: sb.userId,
              mmrAAtCreate: sa.mmrAtLock,
              mmrBAtCreate: sb.mmrAtLock
            }
          });
          pairingCount++;
        }
      }
    }

    return { weeksCreated: weeksToCreate, matchupCount, pairingCount };
  });

  return json(res, 200, { ok: true, ...result });
}