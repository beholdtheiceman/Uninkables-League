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
    res.setHeader("Allow", "POST, OPTIONS");
    return json(res, 204, {});
  }
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  // Single-league app: seasons belong to the one league.
  const league = await prisma.league.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  if (!league) return json(res, 400, { error: "No league found in the database" });

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

