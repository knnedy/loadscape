import type {
  AppEdge,
  AppNode,
} from "@/app/projects/[id]/_store/topology-store";
import type { TopologyNodeData } from "@/lib/types/topology";

export interface PreviewNode {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "component" | "group" | "note";
  category?: string;
}

export interface PreviewEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed: boolean;
  category?: string;
}

export interface ProjectPreview {
  bounds: { x: number; y: number; width: number; height: number };
  nodes: PreviewNode[];
  edges: PreviewEdge[];
  componentCount: number;
}

const DEFAULT_SIZE = {
  component: { width: 144, height: 46 },
  group: { width: 320, height: 220 },
  note: { width: 200, height: 140 },
} as const;

function kindOf(node: AppNode): PreviewNode["kind"] | null {
  if (node.type === "component") return "component";
  if (node.type === "group-container") return "group";
  if (node.type === "note") return "note";
  return null;
}

function numberOrUndefined(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

// Reduces a stored topology to the few numbers a card thumbnail needs, so
// the client never receives the full jsonb.
export function buildProjectPreview(
  nodes: AppNode[],
  edges: AppEdge[],
): ProjectPreview | null {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const placed = new Map<string, PreviewNode>();

  for (const node of nodes) {
    const kind = kindOf(node);
    const x = numberOrUndefined(node.position?.x);
    const y = numberOrUndefined(node.position?.y);
    if (!kind || x === undefined || y === undefined) continue;

    // Children of a group store positions relative to it.
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const fallback = DEFAULT_SIZE[kind];

    placed.set(node.id, {
      kind,
      x: x + (parent?.position?.x ?? 0),
      y: y + (parent?.position?.y ?? 0),
      width:
        numberOrUndefined(node.measured?.width) ??
        numberOrUndefined(node.width) ??
        numberOrUndefined(node.style?.width) ??
        fallback.width,
      height:
        numberOrUndefined(node.measured?.height) ??
        numberOrUndefined(node.height) ??
        numberOrUndefined(node.style?.height) ??
        fallback.height,
      category:
        kind === "component"
          ? (node.data as TopologyNodeData).category
          : undefined,
    });
  }

  const previewNodes = [...placed.values()];
  if (previewNodes.length === 0) return null;

  const previewEdges: PreviewEdge[] = [];
  for (const edge of edges) {
    const from = placed.get(edge.source);
    const to = placed.get(edge.target);
    if (!from || !to) continue;
    previewEdges.push({
      x1: from.x + from.width / 2,
      y1: from.y + from.height / 2,
      x2: to.x + to.width / 2,
      y2: to.y + to.height / 2,
      dashed: edge.data?.style === "async",
      category: from.category,
    });
  }

  const minX = Math.min(...previewNodes.map((n) => n.x));
  const minY = Math.min(...previewNodes.map((n) => n.y));
  const maxX = Math.max(...previewNodes.map((n) => n.x + n.width));
  const maxY = Math.max(...previewNodes.map((n) => n.y + n.height));

  return {
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    nodes: previewNodes,
    edges: previewEdges,
    componentCount: previewNodes.filter((n) => n.kind === "component").length,
  };
}
