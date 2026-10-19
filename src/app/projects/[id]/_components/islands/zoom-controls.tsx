"use client";

import { useReactFlow, useStore } from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const buttonClass =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

export function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  return (
    <div className="absolute right-4 bottom-5 z-10 flex h-10 items-center gap-0.5 rounded-2xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
      <Tooltip>
        <TooltipTrigger
          onClick={() => zoomOut({ duration: 200 })}
          aria-label="Zoom out"
          className={buttonClass}>
          <Minus size={15} />
        </TooltipTrigger>
        <TooltipContent side="top">Zoom out</TooltipContent>
      </Tooltip>

      <span
        aria-live="off"
        className="min-w-11 text-center text-xs text-foreground tabular-nums">
        {Math.round(zoom * 100)}%
      </span>

      <Tooltip>
        <TooltipTrigger
          onClick={() => zoomIn({ duration: 200 })}
          aria-label="Zoom in"
          className={buttonClass}>
          <Plus size={15} />
        </TooltipTrigger>
        <TooltipContent side="top">Zoom in</TooltipContent>
      </Tooltip>

      <div className="mx-1 h-5 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger
          onClick={() => fitView({ maxZoom: 1, padding: 0.4, duration: 300 })}
          aria-label="Fit to screen"
          className={buttonClass}>
          <Maximize size={15} />
        </TooltipTrigger>
        <TooltipContent side="top">Fit to screen</TooltipContent>
      </Tooltip>
    </div>
  );
}
