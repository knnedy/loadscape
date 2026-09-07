"use client";

import { TopBar } from "./top-bar";
import { CanvasToolbar } from "./canvas-toolbar";
import { Canvas } from "./canvas";
import { ConfigPanel } from "./config-panel";
import { TopologyProvider } from "../_store/topology-provider";
import { ReactFlowProvider } from "@xyflow/react";

export function WorkspaceShell({ projectName }: { projectName: string }) {
  return (
    <TopologyProvider>
      <div className="flex h-screen w-full flex-col">
        <TopBar projectName={projectName} />
        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex-1 overflow-hidden">
            <ReactFlowProvider>
              <Canvas />
            </ReactFlowProvider>
            <CanvasToolbar />
          </div>
          <ConfigPanel />
        </div>
      </div>
    </TopologyProvider>
  );
}
