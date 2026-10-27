import type { TopologyNodeData } from "@/lib/types/topology";
import { presetFor } from "./catalog-presets";
import type { EdgeInput, GraphInput, NodeInput } from "./presets";

interface TopologyNodeLike {
  id: string;
  data: Record<string, unknown>;
}

interface TopologyEdgeLike {
  id: string;
  source: string;
  target: string;
  data?: Record<string, unknown>;
}

function isComponentData(
  data: Record<string, unknown>,
): data is TopologyNodeData {
  return (
    typeof data.componentId === "string" && typeof data.category === "string"
  );
}

function toNodeInput(id: string, data: TopologyNodeData): NodeInput {
  return {
    id,
    preset: presetFor(data.componentId, data.category),
    overrides: {
      capacity: data.capacity,
      instances: data.instances,
      buffer: data.buffer,
      hitRatio: data.hitRatio,
      fanout: data.fanout,
      latencyMs: data.latencyMs,
      failRate: data.failRate,
      rps: data.rps,
    },
  };
}

export function fromTopology(
  nodes: TopologyNodeLike[],
  edges: TopologyEdgeLike[],
): GraphInput {
  const included = new Set<string>();
  const nodeInputs: NodeInput[] = [];

  for (const node of nodes) {
    if (!isComponentData(node.data)) continue;
    included.add(node.id);
    nodeInputs.push(toNodeInput(node.id, node.data));
  }

  const edgeInputs: EdgeInput[] = [];

  for (const edge of edges) {
    if (!included.has(edge.source) || !included.has(edge.target)) continue;
    // Edge direction is a drawing choice; every edge simulates source to target.
    edgeInputs.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      mode: edge.data?.style === "async" ? "async" : "sync",
      share: typeof edge.data?.share === "number" ? edge.data.share : undefined,
    });
  }

  return { nodes: nodeInputs, edges: edgeInputs };
}
