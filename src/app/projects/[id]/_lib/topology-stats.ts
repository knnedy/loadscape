import type { TopologyNodeData } from "@/lib/types/topology";
import type { AppNode, AppEdge } from "../_store/topology-store";

export interface TopologyStats {
  componentCount: number;
  byCategory: Record<string, number>;
  syncEdges: number;
  asyncEdges: number;
}

export function computeTopologyStats(
  nodes: AppNode[],
  edges: AppEdge[],
): TopologyStats {
  const byCategory: Record<string, number> = {};
  let componentCount = 0;

  for (const node of nodes) {
    if (node.type !== "component") continue;
    componentCount += 1;
    const { category } = node.data as TopologyNodeData;
    byCategory[category] = (byCategory[category] ?? 0) + 1;
  }

  const asyncEdges = edges.filter((e) => e.data?.style === "async").length;

  return {
    componentCount,
    byCategory,
    syncEdges: edges.length - asyncEdges,
    asyncEdges,
  };
}
