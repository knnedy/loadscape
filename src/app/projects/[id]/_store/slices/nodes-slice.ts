import { applyNodeChanges, type Node, type NodeChange } from "@xyflow/react";
import type { StateCreator } from "zustand";
import type { TopologyNodeData } from "@/lib/types/topology";
import type { ComponentDef } from "@/lib/catalog/components";
import type { IdCounters } from "../id-counters";
import type { TopologyTemporal } from "../temporal";
import type { AppNode, TopologyState } from "../topology-store";

export type NodeConfigPatch = Partial<
  Pick<
    TopologyNodeData,
    | "capacity"
    | "instances"
    | "buffer"
    | "hitRatio"
    | "fanout"
    | "latencyMs"
    | "failRate"
    | "rps"
  >
>;

// An undefined value removes the key, so stored data keeps only the values
// a user changed and everything else comes from the component's preset.
function applyConfig(
  data: TopologyNodeData,
  patch: NodeConfigPatch,
): TopologyNodeData {
  const next: Record<string, unknown> = { ...data };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  return next as TopologyNodeData;
}

export interface NodesSlice {
  nodes: AppNode[];
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  addComponent: (component: ComponentDef) => void;
  updateNodeCapacity: (id: string, capacity: number | undefined) => void;
  updateSelectedCapacity: (capacity: number | undefined) => void;
  updateNodeConfig: (id: string, patch: NodeConfigPatch) => void;
  updateSelectedConfig: (
    patch: NodeConfigPatch,
    appliesTo?: (data: TopologyNodeData) => boolean,
  ) => void;
  renameNode: (id: string, label: string) => void;
  duplicateNode: (id: string) => void;
  deleteNode: (id: string) => void;
  reparentNode: (
    nodeId: string,
    targetGroupId: string | null,
    positionAbsolute: { x: number; y: number },
  ) => void;
}

export const createNodesSlice =
  (
    initialNodes: AppNode[],
    counters: IdCounters,
  ): StateCreator<TopologyState, [["temporal", unknown]], [], NodesSlice> =>
  (set, get, api) => ({
    nodes: initialNodes,
    onNodesChange: (changes) => {
      const temporal = (api.temporal as TopologyTemporal).getState();
      // Pure selection or React-Flow-internal dimension reports carry
      // no meaningful diagram change — don't let them eat an undo step.
      const cosmeticOnly = changes.every(
        (c) => c.type === "select" || c.type === "dimensions",
      );
      const wasTracking = cosmeticOnly ? temporal.isTracking : false;
      if (cosmeticOnly && wasTracking) temporal.pause();
      set({ nodes: applyNodeChanges<AppNode>(changes, get().nodes) });
      if (cosmeticOnly && wasTracking) temporal.resume();
    },
    addComponent: (component) => {
      const n = counters.next("node");
      const id = `${component.id}-${n}`;
      const newNode: Node<TopologyNodeData> = {
        id,
        position: {
          x: 120 + ((n * 40) % 400),
          y: 320 + ((n * 60) % 200),
        },
        data: {
          componentId: component.id,
          label: component.label,
          category: component.category,
        },
        type: "component",
      };
      set({ nodes: [...get().nodes, newNode] });
    },
    updateNodeCapacity: (id, capacity) =>
      set({
        nodes: get().nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, capacity } } : node,
        ),
      }),
    // Bulk edits read React Flow's `selected` flags, like deleteSelection,
    // and write everything in one `set` so it is a single undo step.
    updateSelectedCapacity: (capacity) =>
      set({
        nodes: get().nodes.map((node) =>
          node.selected && node.type === "component"
            ? ({ ...node, data: { ...node.data, capacity } } as AppNode)
            : node,
        ),
      }),
    updateNodeConfig: (id, patch) =>
      set({
        nodes: get().nodes.map((node) =>
          node.id === id && node.type === "component"
            ? ({
                ...node,
                data: applyConfig(node.data as TopologyNodeData, patch),
              } as AppNode)
            : node,
        ),
      }),
    updateSelectedConfig: (patch, appliesTo) =>
      set({
        nodes: get().nodes.map((node) =>
          node.selected &&
          node.type === "component" &&
          (!appliesTo || appliesTo(node.data as TopologyNodeData))
            ? ({
                ...node,
                data: applyConfig(node.data as TopologyNodeData, patch),
              } as AppNode)
            : node,
        ),
      }),
    renameNode: (id, label) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? ({ ...n, data: { ...n.data, label } } as typeof n) : n,
        ),
      }),
    duplicateNode: (id) => {
      const original = get().nodes.find((n) => n.id === id);
      if (!original || original.type === "group-container") return;

      let newId: string;
      if (original.type === "note") {
        newId = `note-${counters.next("note")}`;
      } else {
        newId = `${(original.data as TopologyNodeData).componentId}-${counters.next("node")}`;
      }

      const newNode = {
        ...original,
        id: newId,
        position: {
          x: original.position.x + 32,
          y: original.position.y + 32,
        },
        selected: false,
      } as AppNode;
      set({
        nodes: [...get().nodes, newNode],
        selectedNodeId: newId,
        inspected: { kind: "node", id: newId },
      });
    },
    deleteNode: (id) => {
      const node = get().nodes.find((n) => n.id === id);
      if (!node) return;
      if (node.type === "group-container") {
        const nodes = get()
          .nodes.filter((n) => n.id !== id)
          .map((n) =>
            n.parentId === id
              ? {
                  ...(() => {
                    const { parentId, extent, ...rest } = n as typeof n & {
                      parentId?: string;
                      extent?: string;
                    };
                    return rest;
                  })(),
                  position: {
                    x: n.position.x + node.position.x,
                    y: n.position.y + node.position.y,
                  },
                }
              : n,
          );
        set({
          nodes,
          selectedNodeId:
            get().selectedNodeId === id ? null : get().selectedNodeId,
          inspected: get().inspected?.id === id ? null : get().inspected,
        });
        return;
      }
      set({
        nodes: get().nodes.filter((n) => n.id !== id),
        edges: get().edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId:
          get().selectedNodeId === id ? null : get().selectedNodeId,
        inspected: get().inspected?.id === id ? null : get().inspected,
      });
    },
    reparentNode: (nodeId, targetGroupId, positionAbsolute) => {
      const nodes = get().nodes;
      const targetGroup = targetGroupId
        ? nodes.find((n) => n.id === targetGroupId)
        : null;
      const updated = nodes.map((n) => {
        if (n.id !== nodeId) return n;
        if (targetGroup) {
          return {
            ...n,
            parentId: targetGroup.id,
            extent: "parent" as const,
            position: {
              x: positionAbsolute.x - targetGroup.position.x,
              y: positionAbsolute.y - targetGroup.position.y,
            },
          };
        }
        const { parentId, extent, ...rest } = n as typeof n & {
          parentId?: string;
          extent?: string;
        };
        return { ...rest, position: positionAbsolute };
      });
      const sorted = [...updated].sort(
        (a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0),
      );
      set({ nodes: sorted });
    },
  });
