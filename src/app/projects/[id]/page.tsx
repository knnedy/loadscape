import { notFound } from "next/navigation";
import { requireSession } from "@/server/session";
import { getProjectWithTopology } from "@/server/projects";
import { WorkspaceShell } from "./_components/workspace-shell";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;

  const project = await getProjectWithTopology(user.id, id);
  if (!project) notFound();

  return (
    <WorkspaceShell
      projectName={project.name}
      user={{ name: user.name, email: user.email }}
    />
  );
}
