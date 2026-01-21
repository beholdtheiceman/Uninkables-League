import { z } from "zod";
import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/playhubAuth.js";

const PatchBody = z.object({
  name: z.string().min(1).optional(),
  phase: z.enum(["OFFSEASON", "REGULAR", "PLAYOFFS", "COMPLETE"]).optional(),

  rosterSize: z.number().int().min(1).optional(),
  preseasonTeamMmrCap: z.number().int().min(1).optional(),
  mmrMin: z.number().int().min(0).optional(),
  mmrMax: z.number().int().min(0).optional(),
  regularWeeks: z.number().int().min(0).optional(),
  playoffWeeks: z.number().int().min(0).optional(),
  offseasonWeeks: z.number().int().min(0).optional(),

  timezone: z.string().min(1).optional(),
  subDeadlineDow: z.number().int().min(0).max(6).optional(),
  scheduleDeadlineDow: z.number().int().min(0).max(6).optional(),
  resultsDeadlineDow: z.number().int().min(0).max(6).optional()
});

export default async function handler(req, res) {
  const seasonId = req.query?.seasonId;
  if (!seasonId) return json(res, 400, { error: "Missing seasonId" });

  if (req.method === "GET") {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        leagueId: true,
        name: true,
        phase: true,
        rosterSize: true,
        preseasonTeamMmrCap: true,
        mmrMin: true,
        mmrMax: true,
        regularWeeks: true,
        playoffWeeks: true,
        offseasonWeeks: true,
        timezone: true,
        subDeadlineDow: true,
        scheduleDeadlineDow: true,
        resultsDeadlineDow: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!season) return json(res, 404, { error: "Season not found" });
    return json(res, 200, { season });
  }

  if (req.method === "PATCH") {
    const existing = await prisma.season.findUnique({ where: { id: seasonId }, select: { id: true, leagueId: true } });
    if (!existing) return json(res, 404, { error: "Season not found" });

    const admin = await requireAdmin(req, existing.leagueId);
    if (!admin.ok) return json(res, admin.status, { error: admin.error });

    const body = PatchBody.parse(await readJson(req));

    const season = await prisma.season.update({
      where: { id: seasonId },
      data: body,
      select: {
        id: true,
        leagueId: true,
        name: true,
        phase: true,
        rosterSize: true,
        preseasonTeamMmrCap: true,
        mmrMin: true,
        mmrMax: true,
        regularWeeks: true,
        playoffWeeks: true,
        offseasonWeeks: true,
        timezone: true,
        subDeadlineDow: true,
        scheduleDeadlineDow: true,
        resultsDeadlineDow: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return json(res, 200, { season });
  }

  if (req.method === "DELETE") {
    const existing = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { id: true, leagueId: true, name: true }
    });
    if (!existing) return json(res, 404, { error: "Season not found" });

    const admin = await requireAdmin(req, existing.leagueId);
    if (!admin.ok) return json(res, admin.status, { error: admin.error });

    await prisma.season.delete({ where: { id: seasonId } });
    return json(res, 200, { ok: true });
  }

  return json(res, 405, { error: "Method not allowed" });
}