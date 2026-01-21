import { prisma } from "../_lib/db.js";
import { json } from "../_lib/http.js";
import { getPrimaryLeague } from "../_lib/singleLeague.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const league = await getPrimaryLeague();
  if (!league) return json(res, 404, { error: "No league found" });

  const seasons = await prisma.season.findMany({
    where: { leagueId: league.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phase: true, createdAt: true, updatedAt: true }
  });

  const currentSeason =
    seasons.find((s) => s.phase === "REGULAR" || s.phase === "PLAYOFFS") ||
    seasons[0] ||
    null;

  return json(res, 200, {
    league: {
      ...league,
      seasons,
      currentSeasonId: currentSeason?.id ?? null
    }
  });
}

