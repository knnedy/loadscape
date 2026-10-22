import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects, projectShares, topologies } from "@/server/db/schema";
import { isUuid } from "@/lib/utils";

// 32 random bytes encoded as base64url are always 43 characters.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createShareToken() {
  return randomBytes(32).toString("base64url");
}

// Joins through projects, so only the owner can see a project's token.
export async function getShareToken(userId: string, projectId: string) {
  if (!isUuid(projectId)) return null;

  const [row] = await db
    .select({ token: projectShares.token })
    .from(projectShares)
    .innerJoin(projects, eq(projects.id, projectShares.projectId))
    .where(
      and(eq(projectShares.projectId, projectId), eq(projects.userId, userId)),
    )
    .limit(1);

  return row?.token ?? null;
}

// Public lookup: whoever holds the token may read the diagram, so this
// returns only what the viewer needs and never selects the owner.
export async function getSharedProject(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;

  const [row] = await db
    .select({
      name: projects.name,
      nodes: topologies.nodes,
      edges: topologies.edges,
    })
    .from(projectShares)
    .innerJoin(projects, eq(projects.id, projectShares.projectId))
    .innerJoin(topologies, eq(topologies.projectId, projects.id))
    .where(eq(projectShares.token, token))
    .limit(1);

  return row ?? null;
}
