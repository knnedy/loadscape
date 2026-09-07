import ELK from "elkjs/lib/elk.bundled.js";
import type { Node, Edge } from "@xyflow/react";
import type {
  TopologyNodeData,
  TopologyGroupData,
  TopologyNoteData,
} from "@/lib/types/topology";

const elk = new ELK();

type AnyNode = Node<TopologyNodeData | TopologyGroupData | TopologyNoteData>;

const DEFAULT_WIDTH = 140;
const DEFAULT_HEIGHT = 70;

interface ElkNode {
  id: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  children?: ElkNode[];
  edges?: { id: string; sources: string[]; targets: string[] }[];
  layoutOptions?: Record<string, string>;
}

export async function tidyLayout(
  nodes: AnyNode[],
  edges: Edge[],
): Promise<AnyNode[]> {
  const noteNodes = nodes.filter((n) => n.type === "note");
  const layoutable = nodes.filter((n) => n.type !== "note");

  const childrenByParent = new Map<string, AnyNode[]>();
  for (const n of layoutable) {
    if (n.parentId) {
      if (!childrenByParent.has(n.parentId))
        childrenByParent.set(n.parentId, []);
      childrenByParent.get(n.parentId)!.push(n);
    }
  }

  function toElkNode(n: AnyNode): ElkNode {
    const children = childrenByParent.get(n.id);
    const width = (n.style?.width as number) ?? DEFAULT_WIDTH;
    const height = (n.style?.height as number) ?? DEFAULT_HEIGHT;
    if (children && children.length > 0) {
      return {
        id: n.id,
        layoutOptions: { "elk.padding": "[top=48,left=24,bottom=24,right=24]" },
        children: children.map(toElkNode),
        edges: edges
          .filter(
            (e) =>
              children.some((c) => c.id === e.source) &&
              children.some((c) => c.id === e.target),
          )
          .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
      };
    }
    return { id: n.id, width, height };
  }

  const topLevel = layoutable.filter((n) => !n.parentId);

  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
    },
    children: topLevel.map(toElkNode),
    edges: edges
      .filter((e) => {
        const source = layoutable.find((n) => n.id === e.source);
        const target = layoutable.find((n) => n.id === e.target);
        return !source?.parentId && !target?.parentId;
      })
      .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const result = await elk.layout(elkGraph as ElkNode);
  const positioned = new Map<
    string,
    { x: number; y: number; width?: number; height?: number }
  >();

  function collect(elkNode: ElkNode) {
    positioned.set(elkNode.id, {
      x: elkNode.x ?? 0,
      y: elkNode.y ?? 0,
      width: elkNode.width,
      height: elkNode.height,
    });
    elkNode.children?.forEach(collect);
  }
  result.children?.forEach((c: ElkNode) => collect(c));

  const updated = nodes.map((n) => {
    if (n.type === "note") return n;
    const pos = positioned.get(n.id);
    if (!pos) return n;
    const isGroup = n.type === "group-container";
    return {
      ...n,
      position: { x: pos.x, y: pos.y },
      style:
        isGroup && pos.width && pos.height
          ? { ...n.style, width: pos.width, height: pos.height }
          : n.style,
    };
  });

  return updated;
}
