"use client";

import { MainMenu } from "./main-menu";
import { ProjectName } from "./project-name";
import { SaveStatus } from "./save-status";

export function ProjectIsland({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  return (
    <div className="absolute top-4 left-4 z-20 flex h-10 items-center gap-2 rounded-2xl border border-border bg-card/95 pr-3 pl-1.5 shadow-lg backdrop-blur-sm">
      <MainMenu />
      <ProjectName projectId={projectId} initialName={projectName} />
      <SaveStatus projectId={projectId} />
    </div>
  );
}
