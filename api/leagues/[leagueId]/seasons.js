import { z } from "zod";
import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/playhubAuth.js";

const Body = z.object({
  name: z.string().min(1),
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
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return json(res, 204, {});
  }
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const leagueId = req.query?.leagueId;
  if (!leagueId) return json(res, 400, { error: "Missing leagueId" });

  const admin = await requireAdmin(req, leagueId);
  if (!admin.ok) return json(res, admin.status, { error: admin.error });

  const body = Body.parse(await readJson(req));

  // Ensure league exists
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { id: true } });
  if (!league) return json(res, 404, { error: "League not found" });

  const season = await prisma.season.create({
    data: {
      leagueId,
      name: body.name,
      phase: body.phase,
      rosterSize: body.rosterSize,
      preseasonTeamMmrCap: body.preseasonTeamMmrCap ?? 1850,
      mmrMin: body.mmrMin ?? 100,
      mmrMax: body.mmrMax ?? 600,
      regularWeeks: body.regularWeeks,
      playoffWeeks: body.playoffWeeks,
      offseasonWeeks: body.offseasonWeeks,
      timezone: body.timezone,
      subDeadlineDow: body.subDeadlineDow,
      scheduleDeadlineDow: body.scheduleDeadlineDow,
      resultsDeadlineDow: body.resultsDeadlineDow
    },
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