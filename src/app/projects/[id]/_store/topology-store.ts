import { createStore } from "zustand/vanilla";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  reconnectEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import type {
  TopologyNodeData,
  TopologyEdgeData,
  EdgeStyle,
  EdgeDirection,
  TopologyNoteData,
} from "@/lib/types/topology";
import { fixtureNodes, fixtureEdges } from "@/lib/simulation/fixtures";
import type { ComponentDef } from "@/lib/catalog/components";
import type { TopologyGroupData } from "@/lib/types/topology";
import { groupColorPalette } from "@/lib/catalog/group-colors";
import { componentCatalog } from "@/lib/catalog/components";
import { Template } from "@/lib/catalog/templates";
import { tidyLayout } from "@/lib/layout";

function markersForDirection(direction: EdgeDirection) {
  const arrow = { type: MarkerType.ArrowClosed };
  return {
    markerEnd:
      direction === "forward" || direction === "bidirectional"
        ? arrow
        : undefined,
    markerStart: direction === "bidirectional" ? arrow : undefined,
  };
}

type AppNode = Node<TopologyNodeData | TopologyGroupData | TopologyNoteData>;
type AppEdge = Edge<TopologyEdgeData>;

export interface TopologyState {
  nodes: AppNode[];
  edges: AppEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addComponent: (component: ComponentDef) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  updateNodeCapacity: (id: string, capacity: number) => void;
  renameNode: (id: string, label: string) => void;
  duplicateNode: (id: string) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  updateEdgeStyle: (id: string, style: EdgeStyle) => void;
  updateEdgeDirection: (id: string, direction: EdgeDirection) => void;
  reconnectEdge: (
    oldEdge: Edge<TopologyEdgeData>,
    newConnection: Connection,
  ) => void;
  addGroup: () => void;
  renameGroup: (id: string, label: string) => void;
  updateGroupColor: (id: string, color: string) => void;
  reparentNode: (
    nodeId: string,
    targetGroupId: string | null,
    positionAbsolute: { x: number; y: number },
  ) => void;
  showMiniMap: boolean;
  toggleMiniMap: () => void;
  insertTemplate: (template: Template) => void;
  addNote: () => void;
  updateNoteText: (id: string, text: string) => void;
  updateNoteColor: (id: string, color: string) => void;
  tidyLayout: () => Promise<void>;
}

export type TopologyStore = ReturnType<typeof createTopologyStore>;

export function createTopologyStore() {
  let nodeIdCounter = 0;
  let groupIdCounter = 0;
  let noteIdCounter = 0;

  return createStore<TopologyState>((set, get) => ({
    nodes: fixtureNodes,
    edges: fixtureEdges,
    selectedNodeId: null,
    selectedEdgeId: null,
    onNodesChange: (changes) =>
      set({ nodes: applyNodeChanges<AppNode>(changes, get().nodes) }),
    onEdgesChange: (changes) =>
      set({ edges: applyEdgeChanges<AppEdge>(changes, get().edges) }),
    onConnect: (connection) => {
      const newEdge: AppEdge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        type: "component",
        data: { style: "sync", direction: "forward" },
        ...markersForDirection("forward"),
      } as AppEdge;
      set({ edges: addEdge<AppEdge>(newEdge, get().edges) });
    },
    addComponent: (component) => {
      nodeIdCounter += 1;
      const id = `${component.id}-${nodeIdCounter}`;
      const newNode: Node<TopologyNodeData> = {
        id,
        position: {
          x: 120 + ((nodeIdCounter * 40) % 400),
          y: 320 + ((nodeIdCounter * 60) % 200),
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
    selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
    selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
    updateNodeCapacity: (id, capacity) =>
      set({
        nodes: get().nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, capacity } } : node,
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
      const data = original.data as TopologyNodeData;
      nodeIdCounter += 1;
      const newId = `${data.componentId}-${nodeIdCounter}`;
      const newNode: Node<TopologyNodeData> = {
        ...original,
        id: newId,
        position: { x: original.position.x + 32, y: original.position.y + 32 },
        selected: false,
        data,
      };
      set({ nodes: [...get().nodes, newNode], selectedNodeId: newId });
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
        });
        return;
      }
      set({
        nodes: get().nodes.filter((n) => n.id !== id),
        edges: get().edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId:
          get().selectedNodeId === id ? null : get().selectedNodeId,
      });
    },
    deleteEdge: (id) =>
      set({
        edges: get().edges.filter((e) => e.id !== id),
        selectedEdgeId:
          get().selectedEdgeId === id ? null : get().selectedEdgeId,
      }),
    updateEdgeLabel: (id, label) =>
      set({
        edges: get().edges.map((e) =>
          e.id === id ? { ...e, data: { ...e.data!, label } } : e,
        ),
      }),
    updateEdgeStyle: (id, style) =>
      set({
        edges: get().edges.map((e) =>
          e.id === id ? { ...e, data: { ...e.data!, style } } : e,
        ),
      }),
    updateEdgeDirection: (id, direction) =>
      set({
        edges: get().edges.map((e) =>
          e.id === id
            ? {
                ...e,
                data: { ...e.data!, direction },
                ...markersForDirection(direction),
              }
            : e,
        ),
      }),
    reconnectEdge: (oldEdge, newConnection) =>
      set({ edges: reconnectEdge(oldEdge, newConnection, get().edges) }),
    addGroup: () => {
      groupIdCounter += 1;
      const id = `group-${groupIdCounter}`;
      const color =
        groupColorPalette[(groupIdCounter - 1) % groupColorPalette.length];
      const newGroup = {
        id,
        type: "group-container",
        position: { x: 160 + groupIdCounter * 20, y: 60 + groupIdCounter * 20 },
        style: { width: 320, height: 220 },
        data: { label: "New Group", color } satisfies TopologyGroupData,
        zIndex: -1,
      };
      set({ nodes: [newGroup, ...get().nodes], selectedNodeId: id });
    },
    renameGroup: (id, label) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label } } : n,
        ),
      }),
    updateGroupColor: (id, color) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, color } } : n,
        ),
      }),
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
    showMiniMap: false,
    toggleMiniMap: () => set({ showMiniMap: !get().showMiniMap }),
    insertTemplate: (template: Template) => {
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
          nodeIdCounter += 1;
          const id = `${component.id}-${nodeIdCounter}`;
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
    addNote: () => {
      noteIdCounter += 1;
      const id = `note-${noteIdCounter}`;
      const color =
        groupColorPalette[(noteIdCounter - 1) % groupColorPalette.length];
      const newNote = {
        id,
        type: "note",
        position: { x: 200 + noteIdCounter * 20, y: 400 + noteIdCounter * 20 },
        style: { width: 200, height: 140 },
        data: { text: "", color } satisfies TopologyNoteData,
      };
      set({ nodes: [...get().nodes, newNote], selectedNodeId: id });
    },
    updateNoteText: (id, text) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, text } } : n,
        ),
      }),
    updateNoteColor: (id, color) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, color } } : n,
        ),
      }),
    tidyLayout: async () => {
      const result = await tidyLayout(get().nodes, get().edges);
      set({ nodes: result });
    },
  }));
}
