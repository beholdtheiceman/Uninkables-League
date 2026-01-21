import { z } from "zod";
import { prisma } from "../_lib/db.js";
import { json, readJson } from "../_lib/http.js";
import { requireAdmin } from "../_lib/playhubAuth.js";

const Body = z.object({
  name: z.string().min(1),
  phase: z.enum(["OFFSEASON", "REGULAR", "PLAYOFFS", "COMPLETE"]).optional()
});

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return json(res, 204, {});
  }

  // Single-league app: pick the primary league (most recently created).
  const league = await prisma.league.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });
  if (!league) return json(res, 400, { error: "No league found in the database" });

  if (req.method === "GET") {
    const seasons = await prisma.season.findMany({
      where: { leagueId: league.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, leagueId: true, name: true, phase: true, createdAt: true, updatedAt: true }
    });

    const currentSeason =
      seasons.find((s) => s.phase === "REGULAR" || s.phase === "PLAYOFFS") || seasons[0] || null;

    return json(res, 200, {
      leagueId: league.id,
      currentSeasonId: currentSeason?.id ?? null,
      seasons
    });
  }

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const admin = await requireAdmin(req, league.id);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const body = Body.parse(await readJson(req));

  const season = await prisma.season.create({
    data: {
      leagueId: league.id,
      name: body.name,
      phase: body.phase
    },
    select: {
      id: true,
      leagueId: true,
      name: true,
      phase: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return json(res, 200, { season });
}

