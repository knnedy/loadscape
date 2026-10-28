"use client";

import type { ReactNode } from "react";
import { RotateCcw, SkipForward } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSimulationStore } from "../../_store/simulation-provider";
import {
  RUN_LENGTH_SECONDS,
  SPEEDS,
  TICKS_PER_SECOND,
} from "../../_store/simulation-store";

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40">
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function RunControls() {
  const status = useSimulationStore((s) => s.status);
  const speed = useSimulationStore((s) => s.speed);
  const seconds = useSimulationStore((s) =>
    Math.floor(s.sim.tick / TICKS_PER_SECOND),
  );
  const stepOnce = useSimulationStore((s) => s.stepOnce);
  const reset = useSimulationStore((s) => s.reset);
  const setSpeed = useSimulationStore((s) => s.setSpeed);

  if (status === "idle") return null;

  return (
    <div className="absolute top-16 right-4 z-20 flex h-9 items-center gap-1 rounded-2xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
      <IconButton
        label="Step one tick"
        disabled={status === "finished"}
        onClick={stepOnce}>
        <SkipForward size={14} />
      </IconButton>
      <IconButton label="Reset" onClick={reset}>
        <RotateCcw size={14} />
      </IconButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <div role="group" aria-label="Speed" className="flex items-center">
        {SPEEDS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={speed === option}
            onClick={() => setSpeed(option)}
            className={cn(
              "h-7 rounded-lg px-2 text-xs font-medium transition-colors",
              speed === option
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}>
            {option}×
          </button>
        ))}
      </div>
      <div className="mx-1 h-4 w-px bg-border" />
      <span className="px-1.5 font-mono text-xs text-muted-foreground tabular-nums">
        {formatClock(seconds)}
        <span className="opacity-60"> / {formatClock(RUN_LENGTH_SECONDS)}</span>
      </span>
    </div>
  );
}
