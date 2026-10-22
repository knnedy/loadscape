"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { projects, projectShares } from "@/server/db/schema";
import { getSession } from "@/server/session";
import { createShareToken } from "@/server/shares";
import { isUuid } from "@/lib/utils";

export type ShareActionError = "unauthorized" | "invalid" | "not_found";

type Failure = { ok: false; error: ShareActionError };

function ownedProjectIds(userId: string) {
  return db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, userId));
}

export async function enableSharing(
  projectId: string,
): Promise<{ ok: true; token: string } | Failure> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!isUuid(projectId)) return { ok: false, error: "invalid" };

  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
    )
    .limit(1);
  if (!owned) return { ok: false, error: "not_found" };

  await db
    .insert(projectShares)
    .values({ projectId, token: createShareToken() })
    .onConflictDoNothing({ target: projectShares.projectId });

  const [share] = await db
    .select({ token: projectShares.token })
    .from(projectShares)
    .where(eq(projectShares.projectId, projectId))
    .limit(1);
  if (!share) return { ok: false, error: "not_found" };

  revalidatePath("/projects/[id]", "page");
  return { ok: true, token: share.token };
}

export async function regenerateShareLink(
  projectId: string,
): Promise<{ ok: true; token: string } | Failure> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!isUuid(projectId)) return { ok: false, error: "invalid" };

  const [updated] = await db
    .update(projectShares)
    .set({ token: createShareToken(), createdAt: new Date() })
    .where(
      and(
        eq(projectShares.projectId, projectId),
        inArray(projectShares.projectId, ownedProjectIds(session.user.id)),
      ),
    )
    .returning({ token: projectShares.token });
  if (!updated) return { ok: false, error: "not_found" };

  revalidatePath("/projects/[id]", "page");
  return { ok: true, token: updated.token };
}

export async function disableSharing(
  projectId: string,
): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!isUuid(projectId)) return { ok: false, error: "invalid" };

  await db
    .delete(projectShares)
    .where(
      and(
        eq(projectShares.projectId, projectId),
        inArray(projectShares.projectId, ownedProjectIds(session.user.id)),
      ),
    );

  revalidatePath("/projects/[id]", "page");
  return { ok: true };
}
