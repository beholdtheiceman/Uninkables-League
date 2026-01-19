import { prisma } from "../../../_lib/db.js";
import { json } from "../../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const seasonId = req.query?.seasonId;
  if (!seasonId) return json(res, 400, { error: "Missing seasonId" });

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: {
      id: true,
      leagueId: true,
      timezone: true,
      subDeadlineDow: true,
      scheduleDeadlineDow: true,
      resultsDeadlineDow: true
    }
  });
  if (!season) return json(res, 404, { error: "Season not found" });

  const week = await prisma.seasonWeek.findFirst({
    where: { seasonId, state: "OPEN" },
    orderBy: { weekIndex: "asc" },
    select: {
      id: true,
      seasonId: true,
      weekIndex: true,
      type: true,
      state: true,
      opensAt: true,
      locksAt: true,
      createdAt: true
    }
  });

  return json(res, 200, {
    season: {
      id: season.id,
      leagueId: season.leagueId,
      timezone: season.timezone,
      subDeadlineDow: season.subDeadlineDow,
      scheduleDeadlineDow: season.scheduleDeadlineDow,
      resultsDeadlineDow: season.resultsDeadlineDow
    },
    week
  });
}