import { prisma } from "../../../../_lib/db.js";
import { json } from "../../../../_lib/http.js";
import { requireAdmin } from "../../../../_lib/playhubAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const seasonId = req.query?.seasonId;
  const teamId = req.query?.teamId;
  if (!seasonId) return json(res, 400, { error: "Missing seasonId" });
  if (!teamId) return json(res, 400, { error: "Missing teamId" });

  const team = await prisma.seasonTeam.findUnique({
    where: { id: teamId },
    select: { id: true, seasonId: true, season: { select: { id: true, leagueId: true, preseasonTeamMmrCap: true } } }
  });
  if (!team || team.seasonId !== seasonId) return json(res, 404, { error: "Team not found" });

  const admin = await requireAdmin(req, team.season.leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const slots = await prisma.seasonRosterSlot.findMany({
    where: { seasonTeamId: teamId },
    select: { id: true, userId: true, mmrAtSubmit: true }
  });

  if (slots.length !== 5) return json(res, 400, { error: "Roster must have exactly 5 submitted slots" });

  const total = slots.reduce((sum, s) => sum + s.mmrAtSubmit, 0);
  if (total > team.season.preseasonTeamMmrCap) {
    return json(res, 400, { error: `Preseason cap exceeded: ${total} > ${team.season.preseasonTeamMmrCap}`, totalMmr: total });
  }

  // Lock snapshot
  await prisma.seasonRosterSlot.updateMany({
    where: { seasonTeamId: teamId },
    data: { mmrAtLock: undefined }
  });

  // Prisma doesn't support setting to field value in updateMany; do per-row
  await prisma.$transaction(
    slots.map((s) =>
      prisma.seasonRosterSlot.update({
        where: { id: s.id },
        data: { mmrAtLock: s.mmrAtSubmit }
      })
    )
  );

  await prisma.seasonTeam.update({
    where: { id: teamId },
    data: { rosterApprovedAt: new Date() }
  });

  return json(res, 200, { ok: true, totalMmr: total });
}