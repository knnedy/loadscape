"use client";

import { Pause, Play, Share2 } from "lucide-react";
import { UserMenu, type AppUser } from "../../../_components/user-menu";
import { useSimulationStore } from "../../_store/simulation-provider";
import { useTopologyStore } from "../../_store/topology-provider";
import { ReadinessIndicator } from "./readiness-indicator";

const RUN_LABELS = {
  idle: "Run",
  running: "Pause",
  paused: "Resume",
  finished: "Run again",
} as const;

export function ActionsIsland({ user }: { user: AppUser }) {
  const openPanel = useTopologyStore((s) => s.openPanel);
  const status = useSimulationStore((s) => s.status);
  const canRun = useSimulationStore((s) => s.order !== null);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);

  const running = status === "running";

  return (
    <div className="absolute top-4 right-4 z-20 flex h-10 items-center gap-2.5 rounded-2xl border border-border bg-card/95 pr-1.5 pl-2 shadow-lg backdrop-blur-sm">
      <ReadinessIndicator />
      <button
        type="button"
        onClick={() => openPanel("share")}
        aria-label="Share"
        className="flex h-8 items-center gap-1.5 rounded-[10px] border border-border px-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent md:px-3">
        <Share2 size={14} />
        <span className="hidden md:inline">Share</span>
      </button>
      <button
        type="button"
        disabled={!canRun}
        onClick={running ? pause : play}
        className="flex h-8 items-center gap-1.5 rounded-[10px] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-transform duration-150 hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50">
        {running ? (
          <Pause size={12} fill="currentColor" />
        ) : (
          <Play size={12} fill="currentColor" />
        )}
        {RUN_LABELS[status]}
      </button>
      <UserMenu user={user} />
    </div>
  );
}
