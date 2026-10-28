"use client";

import { useEffect, useRef, useState } from "react";
import { useOptionalSimulationStoreApi } from "../_store/simulation-provider";
import type { SimulationState } from "../_store/simulation-store";

// About 12 updates a second. The engine can tick far faster than React
// should re-render, and the particle layer reads the store directly.
const INTERVAL_MS = 80;

export function useThrottledSimulation<T>(
  select: (state: SimulationState) => T,
): T | undefined {
  const simulation = useOptionalSimulationStoreApi();
  const selectRef = useRef(select);
  const [value, setValue] = useState<T | undefined>(() =>
    simulation ? select(simulation.getState()) : undefined,
  );

  useEffect(() => {
    selectRef.current = select;
  });

  useEffect(() => {
    if (!simulation) return;

    let latest = selectRef.current(simulation.getState());
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastPublished = 0;

    function publish() {
      timer = null;
      lastPublished = performance.now();
      setValue(latest);
    }

    const unsubscribe = simulation.subscribe((state) => {
      const next = selectRef.current(state);
      if (Object.is(next, latest)) return;
      latest = next;

      // A reset or a structural change clears the value and shows at once.
      if (next == null) {
        if (timer !== null) clearTimeout(timer);
        publish();
        return;
      }
      if (timer === null) {
        timer = setTimeout(
          publish,
          Math.max(0, INTERVAL_MS - (performance.now() - lastPublished)),
        );
      }
    });

    return () => {
      unsubscribe();
      if (timer !== null) clearTimeout(timer);
    };
  }, [simulation]);

  return value;
}
