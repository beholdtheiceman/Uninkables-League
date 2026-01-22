import { prisma } from "../../_lib/db.js";
import { json } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/playhubAuth.js";
import { computePrDeltaA } from "../../_lib/pr.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const weekId = req.query?.weekId;
  if (!weekId) return json(res, 400, { error: "Missing weekId" });

  const week = await prisma.seasonWeek.findUnique({
    where: { id: weekId },
    select: {
      id: true,
      seasonId: true,
      weekIndex: true,
      state: true,
      season: {
        select: {
          id: true,
          leagueId: true,
          mmrMin: true,
          mmrMax: true
        }
      },
      matchups: {
        select: {
          id: true,
          teamAId: true,
          teamBId: true,
          pairings: {
            orderBy: { seedIndex: "asc" },
            select: {
              id: true,
              seedIndex: true,
              state: true,
              playerAId: true,
              playerBId: true,
              gamesWonA: true,
              gamesWonB: true
            }
          }
        }
      }
    }
  });

  if (!week) return json(res, 404, { error: "Week not found" });

  const admin = await requireAdmin(req, week.season.leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  if (week.state === "FINAL") {
    return json(res, 409, { error: "Week already finalized" });
  }

  const notFinal = [];
  for (const m of week.matchups) {
    for (const p of m.pairings) {
      if (p.state !== "FINAL") notFinal.push({ pairingId: p.id, seedIndex: p.seedIndex, state: p.state });
    }
  }
  if (notFinal.length) {
    return json(res, 409, {
      error: "All pairings must be FINAL before week can be finalized",
      notFinal
    });
  }

  const pointsEvents = [];
  const teamWeekPoints = new Map(); // teamId -> points (excluding bonus)

  const perMatchupPoints = new Map(); // matchupId -> { teamAId, teamBId, a, b }

  const allUserIds = new Set();
  const mmrDeltas = new Map(); // userId -> delta

  for (const matchup of week.matchups) {
    const matchupAgg = { teamAId: matchup.teamAId, teamBId: matchup.teamBId, a: 0, b: 0 };

    for (const p of matchup.pairings) {
      allUserIds.add(p.playerAId);
      allUserIds.add(p.playerBId);

      // game win points
      pointsEvents.push({
        seasonId: week.seasonId,
        weekId: week.id,
        teamId: matchup.teamAId,
        userId: p.playerAId,
        type: "GAME_WIN",
        points: p.gamesWonA,
        reason: `Week ${week.weekIndex} pairing ${p.seedIndex} game wins`
      });
      pointsEvents.push({
        seasonId: week.seasonId,
        weekId: week.id,
        teamId: matchup.teamBId,
        userId: p.playerBId,
        type: "GAME_WIN",
        points: p.gamesWonB,
        reason: `Week ${week.weekIndex} pairing ${p.seedIndex} game wins`
      });

      matchupAgg.a += p.gamesWonA;
      matchupAgg.b += p.gamesWonB;

      // match win (+1)
      const aWon = p.gamesWonA > p.gamesWonB;
      const winnerUserId = aWon ? p.playerAId : p.playerBId;
      const winnerTeamId = aWon ? matchup.teamAId : matchup.teamBId;
      pointsEvents.push({
        seasonId: week.seasonId,
        weekId: week.id,
        teamId: winnerTeamId,
        userId: winnerUserId,
        type: "MATCH_WIN",
        points: 1,
        reason: `Week ${week.weekIndex} pairing ${p.seedIndex} match win`
      });

      matchupAgg.a += aWon ? 1 : 0;
      matchupAgg.b += aWon ? 0 : 1;

      // Placeholder MMR deltas; replaced later once we know "before" ratings.
      // Keep a marker so we have all participants; actual PR deltas are computed inside the transaction.
      mmrDeltas.set(p.playerAId, (mmrDeltas.get(p.playerAId) || 0) + 0);
      mmrDeltas.set(p.playerBId, (mmrDeltas.get(p.playerBId) || 0) + 0);
    }

    perMatchupPoints.set(matchup.id, matchupAgg);
  }

  // aggregate team week points (excluding bonus)
  for (const e of pointsEvents) {
    if (!e.teamId) continue;
    teamWeekPoints.set(e.teamId, (teamWeekPoints.get(e.teamId) || 0) + e.points);
  }

  // add team week bonus events per matchup
  for (const [matchupId, agg] of perMatchupPoints.entries()) {
    let bonusA = 0;
    let bonusB = 0;
    if (agg.a > agg.b) {
      bonusA = 3;
      bonusB = 0;
    } else if (agg.b > agg.a) {
      bonusA = 0;
      bonusB = 3;
    } else {
      bonusA = 1;
      bonusB = 1;
    }

    pointsEvents.push({
      seasonId: week.seasonId,
      weekId: week.id,
      teamId: agg.teamAId,
      userId: null,
      type: "TEAM_WEEK_BONUS",
      points: bonusA,
      reason: `Week ${week.weekIndex} bonus (matchup ${matchupId})`
    });

    pointsEvents.push({
      seasonId: week.seasonId,
      weekId: week.id,
      teamId: agg.teamBId,
      userId: null,
      type: "TEAM_WEEK_BONUS",
      points: bonusB,
      reason: `Week ${week.weekIndex} bonus (matchup ${matchupId})`
    });
  }

  const userIds = Array.from(allUserIds);

  const result = await prisma.$transaction(async (tx) => {
    // Ensure LeagueRating exists
    const existing = await tx.leagueRating.findMany({
      where: { leagueId: week.season.leagueId, userId: { in: userIds } },
      select: { userId: true, mmr: true }
    });

    const beforeMap = new Map(existing.map((r) => [r.userId, r.mmr]));
    const missing = userIds.filter((id) => !beforeMap.has(id));

    if (missing.length) {
      await tx.leagueRating.createMany({
        data: missing.map((userId) => ({ leagueId: week.season.leagueId, userId, mmr: 250 })),
        skipDuplicates: true
      });
      const created = await tx.leagueRating.findMany({
        where: { leagueId: week.season.leagueId, userId: { in: missing } },
        select: { userId: true, mmr: true }
      });
      for (const r of created) beforeMap.set(r.userId, r.mmr);
    }

    // Write points
    await tx.pointsEvent.createMany({
      data: pointsEvents
    });

    // Compute PR deltas (ELO-inspired) + write MMREvents.
    // We treat LeagueRating.mmr as the hidden PR, and clamp to [mmrMin..mmrMax] only for display elsewhere.
    const mmrEvents = [];

    // Compute per-pairing delta based on current hidden ratings ("before" map).
    for (const matchup of week.matchups) {
      for (const p of matchup.pairings) {
        const beforeA = beforeMap.get(p.playerAId) ?? 250;
        const beforeB = beforeMap.get(p.playerBId) ?? 250;

        const deltaA = computePrDeltaA(beforeA, beforeB, p.gamesWonA, p.gamesWonB, 25);
        const deltaB = -deltaA;

        mmrDeltas.set(p.playerAId, (mmrDeltas.get(p.playerAId) || 0) + deltaA);
        mmrDeltas.set(p.playerBId, (mmrDeltas.get(p.playerBId) || 0) + deltaB);
      }
    }

    for (const uid of userIds) {
      const before = beforeMap.get(uid) ?? 250;
      const delta = mmrDeltas.get(uid) || 0;
      // Store hidden PR without clamping so we can track beyond 100..600 internally.
      const after = before + delta;

      // Update rating
      await tx.leagueRating.update({
        where: { leagueId_userId: { leagueId: week.season.leagueId, userId: uid } },
        data: { mmr: after }
      });

      mmrEvents.push({
        leagueId: week.season.leagueId,
        userId: uid,
        type: "MATCH_RESULT",
        delta,
        mmrBefore: before,
        mmrAfter: after,
        reason: `Week ${week.weekIndex} finalize`
      });
    }

    await tx.mMREvent.createMany({ data: mmrEvents });

    // Mark states final
    await tx.seedPairing.updateMany({
      where: { matchup: { seasonWeekId: week.id } },
      data: { state: "FINAL" }
    });

    await tx.weekMatchup.updateMany({
      where: { seasonWeekId: week.id },
      data: { state: "FINAL" }
    });

    const finalWeek = await tx.seasonWeek.update({
      where: { id: week.id },
      data: { state: "FINAL", locksAt: new Date() },
      select: { id: true, state: true }
    });

    return {
      finalWeek,
      pointsEventsCreated: pointsEvents.length,
      mmrEventsCreated: mmrEvents.length
    };
  });

  return json(res, 200, { ok: true, ...result });
}