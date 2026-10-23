"use client";

import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import { Eye, Waypoints } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Canvas } from "@/app/projects/[id]/_components/canvas/canvas";
import { ZoomControls } from "@/app/projects/[id]/_components/islands/zoom-controls";
import { TopologyProvider } from "@/app/projects/[id]/_store/topology-provider";
import type { InitialTopology } from "@/app/projects/[id]/_store/topology-store";

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
        <ReactFlowProvider>
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

            {initialTopology.nodes.length === 0 && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                This diagram is empty.
              </p>
            )}

            <ZoomControls />
          </div>
        </ReactFlowProvider>
      </TopologyProvider>
    </TooltipProvider>
  );
}
