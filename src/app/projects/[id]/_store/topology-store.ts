import { createStore } from "zustand/vanilla";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "reactflow";
import type {
  TopologyNodeData,
  TopologyEdgeData,
  EdgeStyle,
  EdgeDirection,
} from "@/lib/types/topology";
import { fixtureNodes, fixtureEdges } from "@/lib/simulation/fixtures";
import type { ComponentDef } from "@/lib/catalog/components";
import { updateEdge } from "reactflow";

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

export interface TopologyState {
  nodes: Node<TopologyNodeData>[];
  edges: Edge<TopologyEdgeData>[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addComponent: (component: ComponentDef) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  updateNodeCapacity: (id: string, capacity: number) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  updateEdgeStyle: (id: string, style: EdgeStyle) => void;
  updateEdgeDirection: (id: string, direction: EdgeDirection) => void;
  reconnectEdge: (
    oldEdge: Edge<TopologyEdgeData>,
    newConnection: Connection,
  ) => void;
}

export type TopologyStore = ReturnType<typeof createTopologyStore>;

export function createTopologyStore() {
  let nodeIdCounter = 0;

  return createStore<TopologyState>((set, get) => ({
    nodes: fixtureNodes,
    edges: fixtureEdges,
    selectedNodeId: null,
    selectedEdgeId: null,
    onNodesChange: (changes) =>
      set({ nodes: applyNodeChanges(changes, get().nodes) }),
    onEdgesChange: (changes) =>
      set({ edges: applyEdgeChanges(changes, get().edges) }),
    onConnect: (connection) => {
      const newEdge: Edge<TopologyEdgeData> = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        type: "component",
        data: { style: "sync", direction: "forward" },
        ...markersForDirection("forward"),
      } as Edge<TopologyEdgeData>;
      set({ edges: addEdge(newEdge, get().edges) });
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
    deleteNode: (id) =>
      set({
        nodes: get().nodes.filter((n) => n.id !== id),
        edges: get().edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId:
          get().selectedNodeId === id ? null : get().selectedNodeId,
      }),
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
      set({ edges: updateEdge(oldEdge, newConnection, get().edges) }),
  }));
}
