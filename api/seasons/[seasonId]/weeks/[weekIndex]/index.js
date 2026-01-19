import { prisma } from "../../../../_lib/db.js";
import { json } from "../../../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const seasonId = req.query?.seasonId;
  const weekIndexRaw = req.query?.weekIndex;
  if (!seasonId) return json(res, 400, { error: "Missing seasonId" });
  if (!weekIndexRaw) return json(res, 400, { error: "Missing weekIndex" });

  const weekIndex = Number(weekIndexRaw);
  if (!Number.isFinite(weekIndex) || !Number.isInteger(weekIndex) || weekIndex < 1) {
    return json(res, 400, { error: "Invalid weekIndex" });
  }

  const week = await prisma.seasonWeek.findUnique({
    where: { seasonId_weekIndex: { seasonId, weekIndex } },
    select: {
      id: true,
      seasonId: true,
      weekIndex: true,
      type: true,
      state: true,
      opensAt: true,
      locksAt: true,
      createdAt: true,
      matchups: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          seasonWeekId: true,
          state: true,
          createdAt: true,
          teamA: {
            select: {
              id: true,
              name: true,
              captain: { select: { id: true, email: true } },
              rosterApprovedAt: true
            }
          },
          teamB: {
            select: {
              id: true,
              name: true,
              captain: { select: { id: true, email: true } },
              rosterApprovedAt: true
            }
          },
          pairings: {
            orderBy: { seedIndex: "asc" },
            select: {
              id: true,
              seedIndex: true,
              state: true,
              playerA: { select: { id: true, email: true } },
              playerB: { select: { id: true, email: true } },
              mmrAAtCreate: true,
              mmrBAtCreate: true,
              scheduledFor: true,
              scheduleProposedByUserId: true,
              scheduleConfirmedByA: true,
              scheduleConfirmedByB: true,
              gamesWonA: true,
              gamesWonB: true,
              reportedByUserId: true,
              reportedAt: true,
              confirmedByOpponent: true
            }
          }
        }
      }
    }
  });

  if (!week) return json(res, 404, { error: "Week not found" });

  return json(res, 200, { week });
}