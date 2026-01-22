import { prisma } from "./db.js";

// Single-league app: always operate on the "primary" league.
// Prefer the league that actually has seasons (most recently-created season wins).
// Falls back to most recently created league if there are no seasons yet.
export async function getPrimaryLeague() {
  const bySeason = await prisma.season.groupBy({
    by: ["leagueId"],
    _max: { createdAt: true },
    _count: { _all: true }
  });

  if (bySeason.length) {
    const best = bySeason
      .slice()
      .sort((a, b) => {
        const at = a._max.createdAt ? new Date(a._max.createdAt).getTime() : 0;
        const bt = b._max.createdAt ? new Date(b._max.createdAt).getTime() : 0;
        if (bt !== at) return bt - at; // newest season wins
        return (b._count?._all || 0) - (a._count?._all || 0); // then most seasons
      })[0];

    const league = await prisma.league.findUnique({
      where: { id: best.leagueId },
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true }
    });
    if (league) return league;
  }

  return await prisma.league.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, createdAt: true, updatedAt: true }
  });
}

