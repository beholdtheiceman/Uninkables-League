import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../_lib/db.js";
import { json, readJson } from "../_lib/http.js";
import { setSession } from "../_lib/auth.js";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const body = Body.parse(await readJson(req));

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) return json(res, 401, { error: "Invalid credentials" });

  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) return json(res, 401, { error: "Invalid credentials" });

  setSession(res, { userId: user.id });
  return json(res, 200, { user: { id: user.id, email: user.email } });
}
