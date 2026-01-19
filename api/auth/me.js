import { prisma } from "../_lib/db.js";
import { json } from "../_lib/http.js";
import { getSession } from "../_lib/auth.js";

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session?.userId) return json(res, 200, { user: null });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true }
  });
  return json(res, 200, { user: user ?? null });
}
