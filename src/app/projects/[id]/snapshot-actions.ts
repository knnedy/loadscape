"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { projects, snapshots } from "@/server/db/schema";
import { getSession } from "@/server/session";
import { getSnapshotTopology } from "@/server/snapshots";
import { isUuid, normalizeSnapshotName } from "@/lib/utils";
import { validateTopology } from "./_lib/topology-io";
import type { AppEdge, AppNode } from "./_store/topology-store";

const MAX_SNAPSHOTS_PER_PROJECT = 30;

export interface SnapshotSummary {
  id: string;
  name: string;
  createdAt: Date;
}

export type SnapshotActionError =
  | "unauthorized"
  | "invalid"
  | "not_found"
  | "limit";

type Failure = { ok: false; error: SnapshotActionError };

export async function createSnapshot(
  projectId: string,
  name: string,
  topology: unknown,
): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const normalizedName = normalizeSnapshotName(name);
  if (!isUuid(projectId) || normalizedName === null) {
    return { ok: false, error: "invalid" };
  }

  let validated: ReturnType<typeof validateTopology>;
  try {
    validated = validateTopology(topology);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (validated.nodes.length === 0) return { ok: false, error: "invalid" };

  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
    )
    .limit(1);
  if (!owned) return { ok: false, error: "not_found" };

  const [{ total }] = await db
    .select({ total: count() })
    .from(snapshots)
    .where(eq(snapshots.projectId, projectId));
  if (total >= MAX_SNAPSHOTS_PER_PROJECT) return { ok: false, error: "limit" };

  await db.insert(snapshots).values({
    projectId,
    name: normalizedName,
    nodes: validated.nodes,
    edges: validated.edges,
  });

  revalidatePath("/projects/[id]", "page");
  return { ok: true };
}

export async function restoreSnapshot(
  snapshotId: string,
): Promise<{ ok: true; nodes: AppNode[]; edges: AppEdge[] } | Failure> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!isUuid(snapshotId)) return { ok: false, error: "invalid" };

  const row = await getSnapshotTopology(session.user.id, snapshotId);
  if (!row) return { ok: false, error: "not_found" };

  return { ok: true, nodes: row.nodes, edges: row.edges };
}

export async function deleteSnapshot(
  snapshotId: string,
): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!isUuid(snapshotId)) return { ok: false, error: "invalid" };

  const deleted = await db
    .delete(snapshots)
    .where(
      and(
        eq(snapshots.id, snapshotId),
        inArray(
          snapshots.projectId,
          db
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.userId, session.user.id)),
        ),
      ),
    )
    .returning({ id: snapshots.id });
  if (deleted.length === 0) return { ok: false, error: "not_found" };

  revalidatePath("/projects/[id]", "page");
  return { ok: true };
}
