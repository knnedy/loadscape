import { notFound } from "next/navigation";
import { requireSession } from "@/server/session";
import { getProjectWithTopology } from "@/server/projects";
import { listTemplates } from "@/server/templates";
import { WorkspaceShell } from "./_components/workspace-shell";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;

  const [project, userTemplates] = await Promise.all([
    getProjectWithTopology(user.id, id),
    listTemplates(user.id),
  ]);
  if (!project) notFound();

  return (
    <WorkspaceShell
      key={project.id}
      projectId={project.id}
      projectName={project.name}
      user={{ name: user.name, email: user.email }}
      initialTopology={{ nodes: project.nodes, edges: project.edges }}
      userTemplates={userTemplates}
    />
  );
}
