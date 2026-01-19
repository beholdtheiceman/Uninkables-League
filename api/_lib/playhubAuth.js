import { prisma } from "./db.js";
import { getSession } from "./auth.js";

function adminEmails() {
  // Temporary bootstrap admin(s) to unblock setup when env vars are not yet configured.
  // Prefer using PLAYHUB_ADMIN_EMAILS in Vercel long-term.
  const bootstrapAdmins = ["sportlarry@gmail.com"];
  const raw = process.env.PLAYHUB_ADMIN_EMAILS || "";
  const fromEnv = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...fromEnv, ...bootstrapAdmins.map((e) => e.toLowerCase())]));
}

export function isEnvAdminEmail(email) {
  if (!email) return false;
  return adminEmails().includes(String(email).toLowerCase());
}

export async function getAuthedUser(req) {
  const session = getSession(req);
  if (!session?.userId) return null;
  return await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true }
  });
}

export async function requireAuth(req) {
  const user = await getAuthedUser(req);
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true, user };
}

export async function requireAdmin(req, leagueId = null) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  if (isEnvAdminEmail(auth.user.email)) return auth;

  if (!leagueId) return { ok: false, status: 403, error: "Forbidden" };

  const member = await prisma.leagueMember.findUnique({
    where: {
      leagueId_userId: {
        leagueId,
        userId: auth.user.id
      }
    },
    select: { role: true }
  });

  if (member?.role === "ADMIN") return auth;
  return { ok: false, status: 403, error: "Forbidden" };
}
export async function requireCaptain(req, leagueId) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  if (isEnvAdminEmail(auth.user.email)) return auth;

  const member = await prisma.leagueMember.findUnique({
    where: {
      leagueId_userId: { leagueId, userId: auth.user.id }
    },
    select: { role: true }
  });

  if (member?.role === "CAPTAIN" || member?.role === "ADMIN") return auth;
  return { ok: false, status: 403, error: "Forbidden" };
}