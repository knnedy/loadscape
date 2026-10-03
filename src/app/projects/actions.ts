"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects, topologies } from "@/server/db/schema";
import { getSession } from "@/server/session";
import { isUuid, normalizeProjectName } from "@/lib/utils";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "invalid" | "not_found" };

// Creates the project and its empty topology together, so a project never
// exists without one. On success it redirects. redirect() throws by design,
// so don't wrap calls to this action in try/catch.
export async function createProject(): Promise<{
  ok: false;
  error: "unauthorized";
}> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const projectId = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({ userId: session.user.id })
      .returning({ id: projects.id });
    await tx.insert(topologies).values({ projectId: project.id });
    return project.id;
  });

  redirect(`/projects/${projectId}`);
}

export async function renameProject(
  projectId: string,
  name: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const normalized = normalizeProjectName(name);
  if (!isUuid(projectId) || !normalized) return { ok: false, error: "invalid" };

  const updated = await db
    .update(projects)
    .set({ name: normalized })
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
    )
    .returning({ id: projects.id });
  if (updated.length === 0) return { ok: false, error: "not_found" };

  revalidatePath("/projects");
  return { ok: true };
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!isUuid(projectId)) return { ok: false, error: "invalid" };

  const deleted = await db
    .delete(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
    )
    .returning({ id: projects.id });
  if (deleted.length === 0) return { ok: false, error: "not_found" };

  revalidatePath("/projects");
  return { ok: true };
}
