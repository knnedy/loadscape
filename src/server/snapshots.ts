import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects, snapshots } from "@/server/db/schema";
import { isUuid } from "@/lib/utils";

// Both queries join through projects, so a user can only ever reach
// snapshots of projects they own.
export async function listSnapshots(userId: string, projectId: string) {
  if (!isUuid(projectId)) return [];

  return db
    .select({
      id: snapshots.id,
      name: snapshots.name,
      createdAt: snapshots.createdAt,
    })
    .from(snapshots)
    .innerJoin(projects, eq(projects.id, snapshots.projectId))
    .where(and(eq(snapshots.projectId, projectId), eq(projects.userId, userId)))
    .orderBy(desc(snapshots.createdAt));
}

export async function getSnapshotTopology(userId: string, snapshotId: string) {
  if (!isUuid(snapshotId)) return null;

  const [row] = await db
    .select({ nodes: snapshots.nodes, edges: snapshots.edges })
    .from(snapshots)
    .innerJoin(projects, eq(projects.id, snapshots.projectId))
    .where(and(eq(snapshots.id, snapshotId), eq(projects.userId, userId)))
    .limit(1);

  return row ?? null;
}
