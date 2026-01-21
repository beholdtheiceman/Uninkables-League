import { z } from "zod";
import { prisma } from "../_lib/db.js";
import { json, readJson } from "../_lib/http.js";
import { getSession } from "../_lib/auth.js";

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

async function requireAdmin(req) {
  const session = getSession(req);
  if (!session?.userId) return { ok: false, status: 401, error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true }
  });
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  const isAdmin = adminEmails().includes(user.email.toLowerCase());
  if (!isAdmin) return { ok: false, status: 403, error: "Forbidden" };

  return { ok: true, user };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const leagues = await prisma.league.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return json(res, 200, { leagues });
  }

  if (req.method === "POST") {
    // This app is intended to run a single existing league.
    // Prevent accidental creation of duplicate leagues via the UI/API.
    return json(res, 405, { error: "League creation is disabled" });
  }

  return json(res, 405, { error: "Method not allowed" });
}
