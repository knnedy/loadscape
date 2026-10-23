import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSharedProject } from "@/server/shares";
import { ShareViewer } from "./_components/share-viewer";

export const metadata: Metadata = {
  title: "Shared diagram",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;

  const project = await getSharedProject(token);
  if (!project) notFound();

  return (
    <ShareViewer
      key={token}
      projectName={project.name}
      initialTopology={{ nodes: project.nodes, edges: project.edges }}
    />
  );
}
