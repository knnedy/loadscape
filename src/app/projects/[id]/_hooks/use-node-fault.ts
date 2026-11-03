"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useOptionalSimulationStoreApi } from "../_store/simulation-provider";
import type { SimulationState } from "../_store/simulation-store";

// Reads one boolean from the run store without needing a provider, so
// components that also render in the shared viewer can use it.
function useSimulationFlag(
  select: (state: SimulationState) => boolean,
): boolean {
  const simulation = useOptionalSimulationStoreApi();
  const subscribe = useCallback(
    (listener: () => void) =>
      simulation ? simulation.subscribe(listener) : () => {},
    [simulation],
  );

  return useSyncExternalStore(
    subscribe,
    () => (simulation ? select(simulation.getState()) : false),
    () => false,
  );
}

export function useNodeDown(id: string): boolean {
  return useSimulationFlag((state) => state.down.has(id));
}

// A node can be killed once the diagram can run, and a node that is already
// down can always be revived, even if an edit has made the diagram unrunnable.
export function useNodeFault(id: string) {
  const simulation = useOptionalSimulationStoreApi();
  const down = useNodeDown(id);
  const available = useSimulationFlag(
    (state) =>
      (state.order !== null || state.down.has(id)) &&
      state.graph?.nodes.some(
        (node) => node.id === id && node.role !== "source",
      ) === true,
  );
  const toggle = useCallback(
    () => simulation?.getState().toggleDown(id),
    [simulation, id],
  );

  return { available, down, toggle };
}
