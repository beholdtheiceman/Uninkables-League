import { prisma } from "./db.js";

// Single-league app: always operate on the "primary" league.
// We pick the most recently created league record to avoid older test data.
export async function getPrimaryLeague() {
  return await prisma.league.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, createdAt: true, updatedAt: true }
  });
}

