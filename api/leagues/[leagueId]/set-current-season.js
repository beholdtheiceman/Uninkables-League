import { z } from "zod";
import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/playhubAuth.js";

const Body = z.object({
  seasonId: z.string().min(1)
});

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const leagueId = req.query?.leagueId;
  if (!leagueId) return json(res, 400, { error: "Missing leagueId" });

  const admin = await requireAdmin(req, leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const body = Body.parse(await readJson(req));

  const season = await prisma.season.findUnique({
    where: { id: body.seasonId },
    select: { id: true, leagueId: true, phase: true, name: true }
  });
  if (!season) return json(res, 404, { error: "Season not found" });
  if (season.leagueId !== leagueId) return json(res, 400, { error: "Season does not belong to league" });

  const result = await prisma.$transaction(async (tx) => {
    // Demote any active seasons first (leave COMPLETE alone).
    const demoted = await tx.season.updateMany({
      where: {
        leagueId,
        id: { not: season.id },
        phase: { in: ["REGULAR", "PLAYOFFS"] }
      },
      data: { phase: "OFFSEASON" }
    });

    const updated = await tx.season.update({
      where: { id: season.id },
      data: { phase: "REGULAR" },
      select: { id: true, name: true, phase: true, leagueId: true }
    });

    return { demotedCount: demoted.count, season: updated };
  });

  return json(res, 200, { ok: true, ...result });
}

