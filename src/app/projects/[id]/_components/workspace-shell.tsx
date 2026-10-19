"use client";

import { ActionsIsland } from "./islands/actions-island";
import { CanvasDock } from "./islands/canvas-dock";
import { ProjectIsland } from "./islands/project-island";
import { ZoomControls } from "./islands/zoom-controls";
import { HistoryDialog } from "./panels/history-dialog";
import { NodeSearch } from "./panels/node-search";
import { ShortcutsDialog } from "./panels/shortcuts-dialog";
import { Canvas } from "./canvas/canvas";
import { ConfigPanel } from "./inspector/config-panel";
import { EmptyState } from "./canvas/empty-state";
import { StatsPanel } from "./inspector/stats-panel";
import { TopologyProvider } from "../_store/topology-provider";
import { useGlobalShortcuts } from "../_hooks/use-global-shortcuts";
import { ReactFlowProvider } from "@xyflow/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppUser } from "../../_components/user-menu";
import type { InitialTopology } from "../_store/topology-store";
import type { SnapshotSummary } from "../_actions/snapshot-actions";
import type { TemplateSummary } from "../_actions/template-actions";

interface WorkspaceShellProps {
  projectId: string;
  projectName: string;
  user: AppUser;
  initialTopology: InitialTopology;
  userTemplates: TemplateSummary[];
  snapshots: SnapshotSummary[];
}

function WorkspaceLayout({
  projectId,
  projectName,
  user,
  userTemplates,
  snapshots,
}: Omit<WorkspaceShellProps, "initialTopology">) {
  useGlobalShortcuts();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="relative flex-1 overflow-hidden">
        <Canvas />
        <EmptyState />
        <ProjectIsland projectId={projectId} projectName={projectName} />
        <ActionsIsland user={user} />
        <StatsPanel />
        <CanvasDock userTemplates={userTemplates} />
        <ZoomControls />
      </div>
      <ConfigPanel />
      <HistoryDialog projectId={projectId} snapshots={snapshots} />
      <NodeSearch />
      <ShortcutsDialog />
    </div>
  );
}

export function WorkspaceShell({
  initialTopology,
  ...layoutProps
}: WorkspaceShellProps) {
  return (
    <TooltipProvider delay={200}>
      <TopologyProvider initialTopology={initialTopology}>
        <ReactFlowProvider>
          <WorkspaceLayout {...layoutProps} />
        </ReactFlowProvider>
      </TopologyProvider>
    </TooltipProvider>
  );
}
