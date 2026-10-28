"use client";

import { useEffect, useMemo } from "react";
import { fromTopology } from "@/lib/simulation/from-topology";
import { resolveGraph } from "@/lib/simulation/presets";
import { useSimulationStoreApi } from "../_store/simulation-provider";
import { useTopologyStore } from "../_store/topology-provider";

export function useSimulationSync() {
  const simulation = useSimulationStoreApi();
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);

  const graph = useMemo(
    () => resolveGraph(fromTopology(nodes, edges)),
    [nodes, edges],
  );

  useEffect(() => {
    simulation.getState().configure(graph);
  }, [simulation, graph]);
}
