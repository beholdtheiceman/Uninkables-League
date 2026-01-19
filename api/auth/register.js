import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../_lib/db.js";
import { json, readJson } from "../_lib/http.js";
import { setSession } from "../_lib/auth.js";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  if (!process.env.JWT_SECRET) return json(res, 500, { error: "Server misconfigured: missing JWT_SECRET" });
  if (!process.env.DATABASE_URL) return json(res, 500, { error: "Server misconfigured: missing DATABASE_URL" });

  try {
    const body = Body.parse(await readJson(req));

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return json(res, 409, { error: "Email already registered" });

    const cost = Number(process.env.BCRYPT_COST || 10);
    const passwordHash = await bcrypt.hash(body.password, cost);

    const user = await prisma.user.create({
      data: { email: body.email, passwordHash },
      select: { id: true, email: true }
    });

    setSession(res, { userId: user.id });
    return json(res, 200, { user });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}