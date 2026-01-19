import { prisma } from "../../_lib/db.js";
import { json } from "../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const seasonId = req.query?.seasonId;
  if (!seasonId) return json(res, 400, { error: "Missing seasonId" });

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true }
  });
  if (!season) return json(res, 404, { error: "Season not found" });

  const [teams, teamAgg, playerAgg] = await Promise.all([
    prisma.seasonTeam.findMany({
      where: { seasonId },
      select: { id: true, name: true, captain: { select: { id: true, email: true } } }
    }),
    prisma.pointsEvent.groupBy({
      by: ["teamId"],
      where: { seasonId, teamId: { not: null } },
      _sum: { points: true }
    }),
    prisma.pointsEvent.groupBy({
      by: ["userId"],
      where: { seasonId, userId: { not: null } },
      _sum: { points: true }
    })
  ]);

  const teamPoints = new Map(teamAgg.map((r) => [r.teamId, r._sum.points || 0]));
  const playerPoints = new Map(playerAgg.map((r) => [r.userId, r._sum.points || 0]));

  const teamStandings = teams
    .map((t) => ({
      teamId: t.id,
      name: t.name,
      captainEmail: t.captain?.email || null,
      points: teamPoints.get(t.id) || 0
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const userIds = Array.from(playerPoints.keys());
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
    : [];
  const emailMap = new Map(users.map((u) => [u.id, u.email]));

  const playerStandings = userIds
    .map((id) => ({ userId: id, email: emailMap.get(id) || null, points: playerPoints.get(id) || 0 }))
    .sort((a, b) => b.points - a.points || String(a.email || a.userId).localeCompare(String(b.email || b.userId)));

  return json(res, 200, { teamStandings, playerStandings });
}