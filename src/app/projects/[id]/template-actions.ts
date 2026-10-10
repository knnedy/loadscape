"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { templates } from "@/server/db/schema";
import { getSession } from "@/server/session";
import { getTemplateTopology } from "@/server/templates";
import {
  isUuid,
  normalizeTemplateDescription,
  normalizeTemplateName,
} from "@/lib/utils";
import { validateTopology } from "./_lib/topology-io";
import type { AppEdge, AppNode } from "./_store/topology-store";

const MAX_TEMPLATES_PER_USER = 50;

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
}

export type TemplateActionError =
  | "unauthorized"
  | "invalid"
  | "not_found"
  | "limit";

type Failure = { ok: false; error: TemplateActionError };

export async function saveAsTemplate(
  name: string,
  description: string,
  topology: unknown,
): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const normalizedName = normalizeTemplateName(name);
  const normalizedDescription = normalizeTemplateDescription(description);
  if (normalizedName === null || normalizedDescription === null) {
    return { ok: false, error: "invalid" };
  }

  let validated: ReturnType<typeof validateTopology>;
  try {
    validated = validateTopology(topology);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (validated.nodes.length === 0) return { ok: false, error: "invalid" };

  const [{ total }] = await db
    .select({ total: count() })
    .from(templates)
    .where(eq(templates.userId, session.user.id));
  if (total >= MAX_TEMPLATES_PER_USER) return { ok: false, error: "limit" };

  await db.insert(templates).values({
    userId: session.user.id,
    name: normalizedName,
    description: normalizedDescription,
    nodes: validated.nodes,
    edges: validated.edges,
  });

  revalidatePath("/projects/[id]", "page");
  return { ok: true };
}

export async function getTemplate(
  templateId: string,
): Promise<{ ok: true; nodes: AppNode[]; edges: AppEdge[] } | Failure> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!isUuid(templateId)) return { ok: false, error: "invalid" };

  const row = await getTemplateTopology(session.user.id, templateId);
  if (!row) return { ok: false, error: "not_found" };

  return { ok: true, nodes: row.nodes, edges: row.edges };
}

export async function deleteTemplate(
  templateId: string,
): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!isUuid(templateId)) return { ok: false, error: "invalid" };

  const deleted = await db
    .delete(templates)
    .where(
      and(eq(templates.id, templateId), eq(templates.userId, session.user.id)),
    )
    .returning({ id: templates.id });
  if (deleted.length === 0) return { ok: false, error: "not_found" };

  revalidatePath("/projects/[id]", "page");
  return { ok: true };
}
