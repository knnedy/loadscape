import { WorkspaceShell } from "./_components/workspace-shell";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkspaceShell projectName={`Project ${id}`} />;
}
