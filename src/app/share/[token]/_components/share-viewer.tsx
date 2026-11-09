"use client";

import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import { Eye, Waypoints } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Canvas } from "@/app/projects/[id]/_components/canvas/canvas";
import { RunButton } from "@/app/projects/[id]/_components/islands/run-button";
import { RunControls } from "@/app/projects/[id]/_components/islands/run-controls";
import { RunSummary } from "@/app/projects/[id]/_components/islands/run-summary";
import { ZoomControls } from "@/app/projects/[id]/_components/islands/zoom-controls";
import { useSimulationLoop } from "@/app/projects/[id]/_hooks/use-simulation-loop";
import { useSimulationSync } from "@/app/projects/[id]/_hooks/use-simulation-sync";
import { SimulationProvider } from "@/app/projects/[id]/_store/simulation-provider";
import { TopologyProvider } from "@/app/projects/[id]/_store/topology-provider";
import type { InitialTopology } from "@/app/projects/[id]/_store/topology-store";

function ViewerLayout({
  projectName,
  empty,
}: {
  projectName: string;
  empty: boolean;
}) {
  // The run happens entirely in this browser tab: nothing is sent anywhere
  // and nothing about it is saved.
  useSimulationSync();
  useSimulationLoop();

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <Canvas />

      <div className="absolute top-4 left-4 z-20 flex h-10 items-center gap-2.5 rounded-2xl border border-border bg-card/95 pr-3 pl-1.5 shadow-lg backdrop-blur-sm">
        <Link
          href="/"
          aria-label="Loadscape"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-accent">
          <Waypoints size={16} />
        </Link>
        <span className="max-w-56 truncate text-[13px] font-medium text-foreground">
          {projectName}
        </span>
        <span className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Eye size={11} />
          View only
        </span>
      </div>

      {empty ? (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          This diagram is empty.
        </p>
      ) : (
        <div className="absolute top-4 right-4 z-20 flex h-10 items-center rounded-2xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
          <RunButton />
        </div>
      )}

      <RunControls />
      <RunSummary />
      <ZoomControls />
    </div>
  );
}

export function ShareViewer({
  projectName,
  initialTopology,
}: {
  projectName: string;
  initialTopology: InitialTopology;
}) {
  return (
    <TooltipProvider delay={200}>
      <TopologyProvider initialTopology={initialTopology} readOnly>
        <SimulationProvider>
          <ReactFlowProvider>
            <ViewerLayout
              projectName={projectName}
              empty={initialTopology.nodes.length === 0}
            />
          </ReactFlowProvider>
        </SimulationProvider>
      </TopologyProvider>
    </TooltipProvider>
  );
}
