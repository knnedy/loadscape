"use client";

import { MainMenu } from "./main-menu";
import { MenuTip, useMenuTip } from "./menu-tip";
import { ProjectName } from "./project-name";
import { SaveStatus } from "./save-status";

export function ProjectIsland({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const { visible, dismiss } = useMenuTip();

  return (
    <div className="absolute top-4 left-4 z-20 flex h-10 items-center gap-2 rounded-2xl border border-border bg-card/95 pr-3 pl-1.5 shadow-lg backdrop-blur-sm">
      <div className="relative">
        <MainMenu
          showTooltip={!visible}
          onOpenChange={(open) => {
            if (open) dismiss();
          }}
        />
        {visible && <MenuTip onDismiss={dismiss} />}
      </div>
      <ProjectName projectId={projectId} initialName={projectName} />
      <SaveStatus projectId={projectId} />
    </div>
  );
}
