import { z } from "zod";
import { prisma } from "../../../../_lib/db.js";
import { json, readJson } from "../../../../_lib/http.js";
import { requireAdmin, requireAuth } from "../../../../_lib/playhubAuth.js";

const Slot = z
  .object({
    slotIndex: z.number().int().min(1).max(5),
    userId: z.string().uuid().optional(),
    email: z.string().email().optional()
  })
  .refine((v) => v.userId || v.email, { message: "Provide userId or email" });

const Body = z.object({
  slots: z.array(Slot).length(5)
});

async function ensureRatings(leagueId, userIds) {
  const existing = await prisma.leagueRating.findMany({
    where: { leagueId, userId: { in: userIds } },
    select: { userId: true, mmr: true }
  });

  const map = new Map(existing.map((r) => [r.userId, r.mmr]));
  const missing = userIds.filter((id) => !map.has(id));

  if (missing.length) {
    await prisma.leagueRating.createMany({
      data: missing.map((userId) => ({ leagueId, userId, mmr: 250 })),
      skipDuplicates: true
    });

    const created = await prisma.leagueRating.findMany({
      where: { leagueId, userId: { in: missing } },
      select: { userId: true, mmr: true }
    });
    for (const r of created) map.set(r.userId, r.mmr);
  }

  return map;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const seasonId = req.query?.seasonId;
  const teamId = req.query?.teamId;
  if (!seasonId) return json(res, 400, { error: "Missing seasonId" });
  if (!teamId) return json(res, 400, { error: "Missing teamId" });

  const auth = await requireAuth(req);
  if (!auth.ok) return json(res, auth.status, { error: auth.error });

  const team = await prisma.seasonTeam.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      seasonId: true,
      captainUserId: true,
      season: { select: { id: true, leagueId: true, preseasonTeamMmrCap: true } }
    }
  });
  if (!team || team.seasonId !== seasonId) return json(res, 404, { error: "Team not found" });

  // Captain of this team OR league admin
  const admin = await requireAdmin(req, team.season.leagueId);
  const isCaptain = auth.user.id === team.captainUserId;
  if (!isCaptain && !admin.ok) return json(res, 403, { error: "Forbidden" });

  const body = Body.parse(await readJson(req));

  // Resolve emails to userIds
  const resolved = [];
  for (const s of body.slots) {
    if (s.userId) {
      resolved.push({ slotIndex: s.slotIndex, userId: s.userId });
      continue;
    }

    const user = await prisma.user.findUnique({ where: { email: s.email }, select: { id: true } });
    if (!user) return json(res, 404, { error: `User not found: ${s.email}` });
    resolved.push({ slotIndex: s.slotIndex, userId: user.id });
  }

  // Validate uniqueness
  const slotIdxSet = new Set(resolved.map((s) => s.slotIndex));
  const userSet = new Set(resolved.map((s) => s.userId));
  if (slotIdxSet.size !== 5) return json(res, 400, { error: "slotIndex must be unique 1..5" });
  if (userSet.size !== 5) return json(res, 400, { error: "Roster must contain 5 unique users" });

  // Ensure ratings exist and compute cap
  const userIds = Array.from(userSet);
  const mmrMap = await ensureRatings(team.season.leagueId, userIds);
  const total = userIds.reduce((sum, id) => sum + (mmrMap.get(id) ?? 250), 0);

  if (total > team.season.preseasonTeamMmrCap) {
    return json(res, 400, {
      error: `Preseason cap exceeded: ${total} > ${team.season.preseasonTeamMmrCap}`,
      totalMmr: total
    });
  }

  // Replace roster slots
  await prisma.seasonRosterSlot.deleteMany({ where: { seasonTeamId: teamId } });
  await prisma.seasonRosterSlot.createMany({
    data: resolved.map((s) => ({
      seasonTeamId: teamId,
      slotIndex: s.slotIndex,
      userId: s.userId,
      mmrAtSubmit: mmrMap.get(s.userId) ?? 250,
      mmrAtLock: null,
      isActive: true
    }))
  });

  await prisma.seasonTeam.update({
    where: { id: teamId },
    data: { rosterSubmittedAt: new Date(), rosterApprovedAt: null }
  });

  return json(res, 200, { ok: true, totalMmr: total });
}