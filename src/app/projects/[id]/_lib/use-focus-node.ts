"use client";

import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useTopologyStore } from "../_store/topology-provider";

// Selects a node, opening its drawer, and pans the camera to it.
export function useFocusNode() {
  const { fitView } = useReactFlow();
  const selectOnly = useTopologyStore((s) => s.selectOnly);

  return useCallback(
    (nodeId: string) => {
      selectOnly(nodeId);
      void fitView({
        nodes: [{ id: nodeId }],
        maxZoom: 1,
        padding: 0.8,
        duration: 400,
      });
    },
    [fitView, selectOnly],
  );
}
