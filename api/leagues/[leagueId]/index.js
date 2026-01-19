import { prisma } from "../../_lib/db.js";
import { json } from "../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const leagueId = req.query?.leagueId;
  if (!leagueId) return json(res, 400, { error: "Missing leagueId" });

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      seasons: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, phase: true, createdAt: true, updatedAt: true }
      }
    }
  });

  if (!league) return json(res, 404, { error: "League not found" });

  const currentSeason =
    league.seasons.find((s) => s.phase === "REGULAR" || s.phase === "PLAYOFFS") ||
    league.seasons[0] ||
    null;

  return json(res, 200, { league: { ...league, currentSeasonId: currentSeason?.id ?? null } });
}