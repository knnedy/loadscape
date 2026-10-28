"use client";

import { ActionsIsland } from "./islands/actions-island";
import { CanvasDock } from "./islands/canvas-dock";
import { ProjectIsland } from "./islands/project-island";
import { RunControls } from "./islands/run-controls";
import { RunSummary } from "./islands/run-summary";
import { ZoomControls } from "./islands/zoom-controls";
import { HistoryDialog } from "./panels/history-dialog";
import { NodeSearch } from "./panels/node-search";
import { ShareDialog } from "./panels/share-dialog";
import { ShortcutsDialog } from "./panels/shortcuts-dialog";
import { Canvas } from "./canvas/canvas";
import { ConfigPanel } from "./inspector/config-panel";
import { EmptyState } from "./canvas/empty-state";
import { StatsChip } from "./islands/stats-chip";
import { SimulationProvider } from "../_store/simulation-provider";
import { TopologyProvider } from "../_store/topology-provider";
import { useGlobalShortcuts } from "../_hooks/use-global-shortcuts";
import { useSimulationLoop } from "../_hooks/use-simulation-loop";
import { useSimulationSync } from "../_hooks/use-simulation-sync";
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
  shareToken?: string | null;
}

function WorkspaceLayout({
  projectId,
  projectName,
  user,
  userTemplates,
  snapshots,
  shareToken = null,
}: Omit<WorkspaceShellProps, "initialTopology">) {
  useGlobalShortcuts();
  useSimulationSync();
  useSimulationLoop();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="relative flex-1 overflow-hidden">
        <Canvas />
        <EmptyState />
        <ProjectIsland projectId={projectId} projectName={projectName} />
        <ActionsIsland user={user} />
        <RunControls />
        <RunSummary />
        <StatsChip />
        <CanvasDock userTemplates={userTemplates} />
        <ZoomControls />
      </div>
      <ConfigPanel />
      <HistoryDialog projectId={projectId} snapshots={snapshots} />
      <ShareDialog projectId={projectId} initialToken={shareToken} />
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
        <SimulationProvider>
          <ReactFlowProvider>
            <WorkspaceLayout {...layoutProps} />
          </ReactFlowProvider>
        </SimulationProvider>
      </TopologyProvider>
    </TooltipProvider>
  );
}
