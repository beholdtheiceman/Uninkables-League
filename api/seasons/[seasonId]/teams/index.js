import { z } from "zod";
import { prisma } from "../../../_lib/db.js";
import { json, readJson } from "../../../_lib/http.js";
import { requireCaptain } from "../../../_lib/playhubAuth.js";

const CreateBody = z.object({
  name: z.string().min(1)
});

export default async function handler(req, res) {
  const seasonId = req.query?.seasonId;
  if (!seasonId) return json(res, 400, { error: "Missing seasonId" });

  const season = await prisma.season.findUnique({ where: { id: seasonId }, select: { id: true, leagueId: true } });
  if (!season) return json(res, 404, { error: "Season not found" });

  if (req.method === "GET") {
    const teams = await prisma.seasonTeam.findMany({
      where: { seasonId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        seasonId: true,
        name: true,
        captainUserId: true,
        rosterSubmittedAt: true,
        rosterApprovedAt: true,
        createdAt: true,
        updatedAt: true,
        captain: { select: { id: true, email: true } },
        rosterSlots: {
          orderBy: { slotIndex: "asc" },
          select: {
            id: true,
            slotIndex: true,
            userId: true,
            mmrAtSubmit: true,
            mmrAtLock: true,
            isActive: true,
            user: { select: { id: true, email: true } }
          }
        }
      }
    });
    return json(res, 200, { teams });
  }

  if (req.method === "POST") {
    const captain = await requireCaptain(req, season.leagueId);
    if (!captain.ok) return json(res, captain.status, { error: captain.error });

    const body = CreateBody.parse(await readJson(req));

    const team = await prisma.seasonTeam.create({
      data: {
        seasonId,
        name: body.name,
        captainUserId: captain.user.id
      },
      select: {
        id: true,
        seasonId: true,
        name: true,
        captainUserId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return json(res, 200, { team });
  }

  return json(res, 405, { error: "Method not allowed" });
}