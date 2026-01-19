import { z } from "zod";
import { prisma } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { requireAdmin, requireAuth } from "../../_lib/playhubAuth.js";

const Body = z
  .object({
    note: z.string().max(2000).optional()
  })
  .optional();

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const pairingId = req.query?.pairingId;
  if (!pairingId) return json(res, 400, { error: "Missing pairingId" });

  const auth = await requireAuth(req);
  if (!auth.ok) return json(res, auth.status, { error: auth.error });

  const pairing = await prisma.seedPairing.findUnique({
    where: { id: pairingId },
    select: {
      id: true,
      playerAId: true,
      playerBId: true,
      matchup: {
        select: {
          seasonWeek: { select: { state: true, season: { select: { leagueId: true } } } }
        }
      }
    }
  });

  if (!pairing) return json(res, 404, { error: "Pairing not found" });

  const leagueId = pairing.matchup.seasonWeek.season.leagueId;

  const isPlayer = auth.user.id === pairing.playerAId || auth.user.id === pairing.playerBId;
  const admin = await requireAdmin(req, leagueId);
  if (!isPlayer && !admin.ok) return json(res, 403, { error: "Forbidden" });

  // Note is accepted but not persisted yet (no field in schema). We'll add ledger/audit notes later.
  Body?.parse(await readJson(req));

  const next = await prisma.seedPairing.update({
    where: { id: pairingId },
    data: { state: "DISPUTED" },
    select: { id: true, state: true }
  });

  return json(res, 200, { pairing: next });
}