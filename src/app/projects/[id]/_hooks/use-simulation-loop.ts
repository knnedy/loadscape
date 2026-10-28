"use client";

import { useEffect } from "react";
import { DT } from "@/lib/simulation/step";
import {
  useSimulationStore,
  useSimulationStoreApi,
} from "../_store/simulation-provider";

// A background tab can pause animation frames for seconds. Capping the
// elapsed time per frame stops that turning into one enormous catch-up.
const MAX_FRAME_SECONDS = 0.1;

export function useSimulationLoop() {
  const simulation = useSimulationStoreApi();
  const running = useSimulationStore((s) => s.status === "running");

  useEffect(() => {
    if (!running) return;

    let frameId = 0;
    let last = performance.now();
    let owed = 0;

    function frame(now: number) {
      const elapsed = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
      last = now;
      owed += (elapsed * simulation.getState().speed) / DT;

      const ticks = Math.floor(owed);
      if (ticks > 0) {
        owed -= ticks;
        simulation.getState().advance(ticks);
      }
      frameId = requestAnimationFrame(frame);
    }

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [running, simulation]);
}
