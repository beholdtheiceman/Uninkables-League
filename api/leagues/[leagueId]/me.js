import { prisma } from "../../_lib/db.js";
import { json } from "../../_lib/http.js";
import { getAuthedUser, isEnvAdminEmail } from "../../_lib/playhubAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const leagueId = req.query?.leagueId;
  if (!leagueId) return json(res, 400, { error: "Missing leagueId" });

  const user = await getAuthedUser(req);
  if (!user) return json(res, 200, { user: null, role: null, isEnvAdmin: false });

  const member = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
    select: { role: true }
  });

  return json(res, 200, {
    user,
    role: member?.role ?? null,
    isEnvAdmin: isEnvAdminEmail(user.email)
  });
}