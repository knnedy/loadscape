"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createTopologyStore,
  type TopologyState,
  type TopologyStore,
} from "./topology-store";

const TopologyStoreContext = createContext<TopologyStore | null>(null);

export function TopologyProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<TopologyStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createTopologyStore();
  }

  return (
    <TopologyStoreContext.Provider value={storeRef.current}>
      {children}
    </TopologyStoreContext.Provider>
  );
}

function useTopologyStoreContext(): TopologyStore {
  const store = useContext(TopologyStoreContext);
  if (!store) {
    throw new Error("useTopologyStore must be used within a TopologyProvider");
  }
  return store;
}

export function useTopologyStore<T>(selector: (state: TopologyState) => T): T {
  return useStore(useTopologyStoreContext(), selector);
}

/**
 * Raw store handle for imperative access — getState()/setState() and the
 * zundo `.temporal` sub-store. Use this outside of reactive selectors,
 * example for pause()/resume() around a multi-tick gesture like a drag.
 * Prefer useTopologyStore for anything that should trigger a re-render.
 */
export function useTopologyStoreApi(): TopologyStore {
  return useTopologyStoreContext();
}

export function useTopologyTemporalStore<T>(
  selector: (state: {
    undo: () => void;
    redo: () => void;
    pastStates: unknown[];
    futureStates: unknown[];
  }) => T,
): T {
  const store = useTopologyStoreContext();
  return useStore(store.temporal, selector);
}
