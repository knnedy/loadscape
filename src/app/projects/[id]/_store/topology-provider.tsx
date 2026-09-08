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

export function useTopologyStore<T>(selector: (state: TopologyState) => T): T {
  const store = useContext(TopologyStoreContext);
  if (!store) {
    throw new Error("useTopologyStore must be used within a TopologyProvider");
  }
  return useStore(store, selector);
}

export function useTopologyTemporalStore<T>(
  selector: (state: {
    undo: () => void;
    redo: () => void;
    pastStates: unknown[];
    futureStates: unknown[];
  }) => T,
): T {
  const store = useContext(TopologyStoreContext);
  if (!store) {
    throw new Error(
      "useTopologyTemporalStore must be used within a TopologyProvider",
    );
  }
  return useStore(store.temporal, selector);
}
