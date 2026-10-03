import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects, topologies } from "@/server/db/schema";
import { isUuid } from "@/lib/utils";

export async function listProjects(userId: string) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectWithTopology(
  userId: string,
  projectId: string,
) {
  if (!isUuid(projectId)) return null;

  const [row] = await db
    .select({
      id: projects.id,
      name: projects.name,
      nodes: topologies.nodes,
      edges: topologies.edges,
      savedAt: topologies.updatedAt,
    })
    .from(projects)
    .innerJoin(topologies, eq(topologies.projectId, projects.id))
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  return row ?? null;
}
