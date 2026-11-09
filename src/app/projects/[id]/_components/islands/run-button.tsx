"use client";

import { Pause, Play } from "lucide-react";
import { useSimulationStore } from "../../_store/simulation-provider";

const LABELS = {
  idle: "Run",
  running: "Pause",
  paused: "Resume",
  finished: "Run again",
} as const;

export function RunButton() {
  const status = useSimulationStore((s) => s.status);
  const canRun = useSimulationStore((s) => s.order !== null);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);

  const running = status === "running";

  return (
    <button
      type="button"
      disabled={!canRun}
      title={
        canRun
          ? undefined
          : "This diagram can't run: it needs a client and no cycles."
      }
      onClick={running ? pause : play}
      className="flex h-8 items-center gap-1.5 rounded-[10px] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-transform duration-150 hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50">
      {running ? (
        <Pause size={12} fill="currentColor" />
      ) : (
        <Play size={12} fill="currentColor" />
      )}
      {LABELS[status]}
    </button>
  );
}
