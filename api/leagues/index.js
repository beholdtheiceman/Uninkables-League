import { z } from "zod";
import { prisma } from "../_lib/db.js";
import { json, readJson } from "../_lib/http.js";
import { getSession } from "../_lib/auth.js";

function adminEmails() {
  const raw = process.env.PLAYHUB_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
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
    const admin = await requireAdmin(req);
    if (!admin.ok) return json(res, admin.status, { error: admin.error });

    const Body = z.object({
      name: z.string().min(1),
      description: z.string().optional()
    });

    const body = Body.parse(await readJson(req));

    const league = await prisma.league.create({
      data: { name: body.name, description: body.description || null },
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true }
    });

    return json(res, 200, { league });
  }

  return json(res, 405, { error: "Method not allowed" });
}
