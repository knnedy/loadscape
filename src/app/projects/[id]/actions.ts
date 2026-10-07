"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects, topologies } from "@/server/db/schema";
import { getSession } from "@/server/session";
import { isUuid } from "@/lib/utils";
import { validateTopology } from "./_lib/topology-io";

export type SaveResult =
  | { ok: true; savedAt: string }
  | { ok: false; error: "unauthorized" | "invalid" | "not_found" };

export async function saveTopology(
  projectId: string,
  topology: unknown,
): Promise<SaveResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!isUuid(projectId)) return { ok: false, error: "invalid" };

  let validated: ReturnType<typeof validateTopology>;
  try {
    validated = validateTopology(topology);
  } catch {
    return { ok: false, error: "invalid" };
  }

  const savedAt = new Date();

  const saved = await db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
      )
      .limit(1);
    if (!owned) return false;

    await tx
      .update(topologies)
      .set({
        nodes: validated.nodes,
        edges: validated.edges,
        updatedAt: savedAt,
      })
      .where(eq(topologies.projectId, projectId));
    // Keeps the /projects list ordered by last edit.
    await tx
      .update(projects)
      .set({ updatedAt: savedAt })
      .where(eq(projects.id, projectId));
    return true;
  });

  if (!saved) return { ok: false, error: "not_found" };
  return { ok: true, savedAt: savedAt.toISOString() };
}
