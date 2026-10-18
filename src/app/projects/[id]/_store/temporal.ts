import type { StoreApi } from "zustand";
import type { TemporalState } from "zundo";
import type { TopologyState } from "./topology-store";

export type TopologyTemporal = StoreApi<
  TemporalState<Pick<TopologyState, "nodes" | "edges">>
>;
