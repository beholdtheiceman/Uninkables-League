import { prisma } from "../../../../_lib/db.js";
import { json } from "../../../../_lib/http.js";
import { requireAdmin } from "../../../../_lib/playhubAuth.js";

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

  const season = await prisma.season.findUnique({ where: { id: seasonId }, select: { id: true, leagueId: true } });
  if (!season) return json(res, 404, { error: "Season not found" });

  const admin = await requireAdmin(req, season.leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const week = await prisma.seasonWeek.findUnique({
    where: { seasonId_weekIndex: { seasonId, weekIndex } },
    select: { id: true, state: true }
  });
  if (!week) return json(res, 404, { error: "Week not found" });

  if (week.state === "FINAL") return json(res, 409, { error: "Week already FINAL" });

  const result = await prisma.$transaction(async (tx) => {
    // lock any currently-open weeks
    await tx.seasonWeek.updateMany({
      where: { seasonId, state: "OPEN" },
      data: { state: "LOCKED", locksAt: new Date() }
    });

    // open this week
    const opened = await tx.seasonWeek.update({
      where: { id: week.id },
      data: { state: "OPEN", opensAt: new Date() },
      select: { id: true, state: true, weekIndex: true }
    });

    // update matchup states
    await tx.weekMatchup.updateMany({
      where: { seasonWeekId: week.id },
      data: { state: "OPEN" }
    });

    return opened;
  });

  return json(res, 200, { ok: true, week: result });
}