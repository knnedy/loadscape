"use client";

import { TopBar } from "./top-bar";
import { CanvasToolbar } from "./canvas-toolbar";
import { Canvas } from "./canvas";
import { ConfigPanel } from "./config-panel";
import { EmptyState } from "./empty-state";
import { StatsPanel } from "./stats-panel";
import { TopologyProvider } from "../_store/topology-provider";
import { ReactFlowProvider } from "@xyflow/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppUser } from "../../_components/user-menu";

export function WorkspaceShell({
  projectName,
  user,
}: {
  projectName: string;
  user: AppUser;
}) {
  return (
    <TooltipProvider delay={200}>
      <TopologyProvider>
        <div className="flex h-screen w-full flex-col">
          <TopBar projectName={projectName} user={user} />
          <div className="flex flex-1 overflow-hidden">
            <div className="relative flex-1 overflow-hidden">
              <ReactFlowProvider>
                <Canvas />
                <EmptyState />
                <StatsPanel />
                <CanvasToolbar />
              </ReactFlowProvider>
            </div>
            <ConfigPanel />
          </div>
        </div>
      </TopologyProvider>
    </TooltipProvider>
  );
}
