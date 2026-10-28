"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createSimulationStore,
  type SimulationState,
  type SimulationStore,
} from "./simulation-store";

const SimulationStoreContext = createContext<SimulationStore | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<SimulationStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createSimulationStore();
  }

  return (
    <SimulationStoreContext.Provider value={storeRef.current}>
      {children}
    </SimulationStoreContext.Provider>
  );
}

function useSimulationStoreContext(): SimulationStore {
  const store = useContext(SimulationStoreContext);
  if (!store) {
    throw new Error(
      "useSimulationStore must be used within a SimulationProvider",
    );
  }
  return store;
}

export function useSimulationStore<T>(
  selector: (state: SimulationState) => T,
): T {
  return useStore(useSimulationStoreContext(), selector);
}

export function useSimulationStoreApi(): SimulationStore {
  return useSimulationStoreContext();
}

// For components that also render outside the workspace, such as the shared
// viewer, where there is no run to show.
export function useOptionalSimulationStoreApi(): SimulationStore | null {
  return useContext(SimulationStoreContext);
}
