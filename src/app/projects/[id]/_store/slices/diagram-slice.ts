import type { Edge, Node } from "@xyflow/react";
import type { StateCreator } from "zustand";
import type { TopologyEdgeData, TopologyNodeData } from "@/lib/types/topology";
import { componentCatalog } from "@/lib/catalog/components";
import type { Template } from "@/lib/catalog/templates";
import { tidyLayout } from "@/lib/layout";
import type { IdCounters } from "../id-counters";
import type { AppEdge, AppNode, TopologyState } from "../topology-store";
import { markersForDirection } from "./edges-slice";

export interface DiagramSlice {
  insertTemplate: (template: Template) => void;
  insertTopology: (nodes: AppNode[], edges: AppEdge[]) => void;
  tidyLayout: () => Promise<void>;
  replaceTopology: (nodes: AppNode[], edges: AppEdge[]) => void;
}

export const createDiagramSlice =
  (
    counters: IdCounters,
  ): StateCreator<TopologyState, [["temporal", unknown]], [], DiagramSlice> =>
  (set, get) => ({
    // Adds a saved diagram next to what's already on the canvas, giving
    // every node and edge a fresh id so nothing can collide.
    insertTopology: (incomingNodes, incomingEdges) => {
      if (incomingNodes.length === 0) return;

      const widthOf = (n: AppNode) =>
        n.measured?.width ??
        n.width ??
        (typeof n.style?.width === "number" ? n.style.width : 160);

      const existing = get().nodes.filter((n) => !n.parentId);
      const anchorX = existing.length
        ? Math.max(...existing.map((n) => n.position.x + widthOf(n))) + 96
        : 0;
      const anchorY = existing.length
        ? Math.min(...existing.map((n) => n.position.y))
        : 0;

      const topLevel = incomingNodes.filter((n) => !n.parentId);
      const originX = Math.min(...topLevel.map((n) => n.position.x));
      const originY = Math.min(...topLevel.map((n) => n.position.y));
      const dx = anchorX - originX;
      const dy = anchorY - originY;

      const idMap = new Map<string, string>();
      const newNodes = incomingNodes.map((node) => {
        let id: string;
        if (node.type === "group-container") {
          id = `group-${counters.next("group")}`;
        } else if (node.type === "note") {
          id = `note-${counters.next("note")}`;
        } else {
          id = `${(node.data as TopologyNodeData).componentId}-${counters.next("node")}`;
        }
        idMap.set(node.id, id);

        // Children keep their position relative to their group.
        const { parentId, ...rest } = node;
        const next = {
          ...rest,
          id,
          position: parentId
            ? node.position
            : { x: node.position.x + dx, y: node.position.y + dy },
        } as AppNode;
        if (parentId) next.parentId = idMap.get(parentId);
        return next;
      });

      const newEdges = incomingEdges.flatMap((edge) => {
        const source = idMap.get(edge.source);
        const target = idMap.get(edge.target);
        if (!source || !target) return [];
        return [
          {
            ...edge,
            id: `edge-${source}-${target}-${Date.now()}-${Math.random()}`,
            source,
            target,
          },
        ];
      });

      set({
        nodes: [...get().nodes, ...newNodes],
        edges: [...get().edges, ...newEdges],
      });
    },
    insertTemplate: (template) => {
      const offsetX = 900;
      const offsetY = 40;
      const idMap = new Map<number, string>();

      const newNodes: Node<TopologyNodeData>[] = template.nodes.map(
        (tn, index) => {
          const component = componentCatalog.find(
            (c) => c.id === tn.componentId,
          );
          if (!component)
            throw new Error(`Unknown component id: ${tn.componentId}`);
          const id = `${component.id}-${counters.next("node")}`;
          idMap.set(index, id);
          return {
            id,
            type: "component",
            position: { x: offsetX + tn.x, y: offsetY + tn.y },
            data: {
              componentId: component.id,
              label: component.label,
              category: component.category,
            },
          };
        },
      );
      const newEdges: Edge<TopologyEdgeData>[] = template.edges.map((te) => ({
        id: `edge-${idMap.get(te.from)}-${idMap.get(te.to)}-${Date.now()}-${Math.random()}`,
        source: idMap.get(te.from)!,
        target: idMap.get(te.to)!,
        type: "component",
        data: { style: "sync", direction: "forward" },
        ...markersForDirection("forward"),
      }));

      set({
        nodes: [...get().nodes, ...newNodes],
        edges: [...get().edges, ...newEdges],
      });
    },
    tidyLayout: async () => {
      const result = await tidyLayout(get().nodes, get().edges);
      set({ nodes: result });
    },
    replaceTopology: (nodes, edges) => {
      counters.raiseFloor(nodes);
      set({
        nodes,
        edges,
        selectedNodeId: null,
        selectedEdgeId: null,
        inspected: null,
      });
    },
  });
