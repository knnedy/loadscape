import { componentCatalog } from "@/lib/catalog/components";
import type { AppNode, AppEdge } from "../_store/topology-store";

export const TOPOLOGY_FILE_VERSION = 1;
export const MAX_NODES = 500;
export const MAX_EDGES = 1000;

const NODE_TYPES = new Set(["component", "group-container", "note"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Runtime-only fields React Flow re-derives; keeping them out of stored and
// exported data avoids stale selection and measurements on load.
function stripTransient<T extends object>(item: T): T {
  const { selected, dragging, measured, resizing, ...rest } = item as T & {
    selected?: boolean;
    dragging?: boolean;
    measured?: unknown;
    resizing?: boolean;
  };
  return rest as T;
}

export function serializeTopology(nodes: AppNode[], edges: AppEdge[]): string {
  return JSON.stringify(
    {
      version: TOPOLOGY_FILE_VERSION,
      nodes: nodes.map(stripTransient),
      edges: edges.map(stripTransient),
    },
    null,
    2,
  );
}

// Shared by JSON import and the save action. Treats input as untrusted.
export function validateTopology(raw: unknown): {
  nodes: AppNode[];
  edges: AppEdge[];
} {
  if (
    !isRecord(raw) ||
    !Array.isArray(raw.nodes) ||
    !Array.isArray(raw.edges)
  ) {
    throw new Error("This doesn't look like a Loadscape diagram.");
  }
  if (raw.version !== undefined && raw.version !== TOPOLOGY_FILE_VERSION) {
    throw new Error(`Unsupported diagram version: ${String(raw.version)}.`);
  }
  if (raw.nodes.length > MAX_NODES || raw.edges.length > MAX_EDGES) {
    throw new Error("This diagram is too large.");
  }

  const componentIds = new Set(componentCatalog.map((c) => c.id));
  const nodeIds = new Set<string>();

  for (const node of raw.nodes) {
    if (
      !isRecord(node) ||
      typeof node.id !== "string" ||
      typeof node.type !== "string" ||
      !NODE_TYPES.has(node.type) ||
      !isRecord(node.position) ||
      !Number.isFinite(node.position.x) ||
      !Number.isFinite(node.position.y) ||
      !isRecord(node.data)
    ) {
      throw new Error("The diagram contains a malformed node.");
    }
    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}.`);
    }
    if (
      node.type === "component" &&
      (typeof node.data.componentId !== "string" ||
        !componentIds.has(node.data.componentId))
    ) {
      throw new Error(`Unknown component: ${String(node.data.componentId)}.`);
    }
    nodeIds.add(node.id);
  }

  const groupIds = new Set(
    raw.nodes
      .filter((n) => (n as AppNode).type === "group-container")
      .map((n) => (n as AppNode).id),
  );
  for (const node of raw.nodes as AppNode[]) {
    if (node.parentId && !groupIds.has(node.parentId)) {
      throw new Error(`Node ${node.id} references a missing group.`);
    }
  }

  const edgeIds = new Set<string>();
  for (const edge of raw.edges) {
    if (
      !isRecord(edge) ||
      typeof edge.id !== "string" ||
      typeof edge.source !== "string" ||
      typeof edge.target !== "string"
    ) {
      throw new Error("The diagram contains a malformed edge.");
    }
    if (edgeIds.has(edge.id)) {
      throw new Error(`Duplicate edge id: ${edge.id}.`);
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(`Edge ${edge.id} points to a missing node.`);
    }
    edgeIds.add(edge.id);
  }

  // React Flow requires parents to precede their children.
  const nodes = (raw.nodes as AppNode[])
    .map(stripTransient)
    .sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));

  const edges = (raw.edges as AppEdge[]).map((edge) => ({
    ...stripTransient(edge),
    type: "component",
    data: { style: "sync", direction: "forward", ...edge.data },
  })) as AppEdge[];

  return { nodes, edges };
}

export function parseTopology(text: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
  return validateTopology(raw);
}
