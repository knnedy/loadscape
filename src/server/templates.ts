import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { templates } from "@/server/db/schema";
import { isUuid } from "@/lib/utils";

export async function listTemplates(userId: string) {
  return db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
    })
    .from(templates)
    .where(eq(templates.userId, userId))
    .orderBy(desc(templates.createdAt));
}

// Null for a malformed id, a missing template, or someone else's.
export async function getTemplateTopology(userId: string, templateId: string) {
  if (!isUuid(templateId)) return null;

  const [row] = await db
    .select({ nodes: templates.nodes, edges: templates.edges })
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .limit(1);

  return row ?? null;
}
