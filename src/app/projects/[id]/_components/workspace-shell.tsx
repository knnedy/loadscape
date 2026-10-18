"use client";

import { TopBar } from "./top-bar";
import { CanvasToolbar } from "./canvas-toolbar";
import { Canvas } from "./canvas/canvas";
import { ConfigPanel } from "./config-panel";
import { EmptyState } from "./canvas/empty-state";
import { StatsPanel } from "./stats-panel";
import { TopologyProvider } from "../_store/topology-provider";
import { ReactFlowProvider } from "@xyflow/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppUser } from "../../_components/user-menu";
import type { InitialTopology } from "../_store/topology-store";
import type { SnapshotSummary } from "../_actions/snapshot-actions";
import type { TemplateSummary } from "../_actions/template-actions";

export function WorkspaceShell({
  projectId,
  projectName,
  user,
  initialTopology,
  userTemplates,
  snapshots,
}: {
  projectId: string;
  projectName: string;
  user: AppUser;
  initialTopology: InitialTopology;
  userTemplates: TemplateSummary[];
  snapshots: SnapshotSummary[];
}) {
  return (
    <TooltipProvider delay={200}>
      <TopologyProvider initialTopology={initialTopology}>
        <ReactFlowProvider>
          <div className="flex h-screen w-full flex-col">
            <TopBar
              projectId={projectId}
              projectName={projectName}
              user={user}
              snapshots={snapshots}
            />
            <div className="flex flex-1 overflow-hidden">
              <div className="relative flex-1 overflow-hidden">
                <Canvas />
                <EmptyState />
                <StatsPanel />
                <CanvasToolbar userTemplates={userTemplates} />
              </div>
              <ConfigPanel />
            </div>
          </div>
        </ReactFlowProvider>
      </TopologyProvider>
    </TooltipProvider>
  );
}
