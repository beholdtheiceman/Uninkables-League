import { z } from "zod";
import { prisma } from "../../../../_lib/db.js";
import { json, readJson } from "../../../../_lib/http.js";
import { requireAdmin } from "../../../../_lib/playhubAuth.js";

const Body = z
  .object({
    open: z.boolean().default(true)
  })
  .optional();

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const seasonId = req.query?.seasonId;
  const weekIndexRaw = req.query?.weekIndex;
  if (!seasonId) return json(res, 400, { error: "Missing seasonId" });
  if (!weekIndexRaw) return json(res, 400, { error: "Missing weekIndex" });

  const weekIndex = Number(weekIndexRaw);
  if (!Number.isFinite(weekIndex) || !Number.isInteger(weekIndex) || weekIndex < 1) {
    return json(res, 400, { error: "Invalid weekIndex" });
  }

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true, leagueId: true, rosterSize: true }
  });
  if (!season) return json(res, 404, { error: "Season not found" });

  const admin = await requireAdmin(req, season.leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const body = Body ? Body.parse(await readJson(req)) : { open: true };

  // Load approved rosters (require lock snapshot)
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
      error: "Need at least 2 teams with approved rosters (mmrAtLock set) to generate matchups",
      eligibleTeams: eligible.length
    });
  }

  const created = await prisma.$transaction(async (tx) => {
    const week = await tx.seasonWeek.upsert({
      where: { seasonId_weekIndex: { seasonId, weekIndex } },
      create: {
        seasonId,
        weekIndex,
        type: "REGULAR",
        state: body?.open ? "OPEN" : "DRAFT",
        opensAt: body?.open ? new Date() : null,
        locksAt: null
      },
      update: {
        state: body?.open ? "OPEN" : undefined,
        opensAt: body?.open ? new Date() : undefined
      },
      select: { id: true, seasonId: true, weekIndex: true, state: true }
    });

    // Clear existing matchups/pairings for idempotence
    await tx.seedPairing.deleteMany({ where: { matchup: { seasonWeekId: week.id } } });
    await tx.weekMatchup.deleteMany({ where: { seasonWeekId: week.id } });

    const pairs = [];
    for (let i = 0; i + 1 < eligible.length; i += 2) {
      pairs.push([eligible[i], eligible[i + 1]]);
    }

    const matchups = [];
    for (const [a, b] of pairs) {
      const matchup = await tx.weekMatchup.create({
        data: {
          seasonWeekId: week.id,
          teamAId: a.id,
          teamBId: b.id,
          state: body?.open ? "OPEN" : "DRAFT"
        },
        select: { id: true }
      });

      const slotsA = a.rosterSlots.filter((s) => s.isActive).sort((x, y) => x.slotIndex - y.slotIndex);
      const slotsB = b.rosterSlots.filter((s) => s.isActive).sort((x, y) => x.slotIndex - y.slotIndex);

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
      }

      matchups.push(matchup);
    }

    return { week, matchupCount: matchups.length, teamCount: eligible.length };
  });

  return json(res, 200, { ok: true, ...created });
}