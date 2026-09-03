import { createStore } from "zustand/vanilla";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "reactflow";
import type { TopologyNodeData } from "@/lib/types/topology";
import { fixtureNodes, fixtureEdges } from "@/lib/simulation/fixtures";
import type { ComponentDef } from "@/lib/catalog/components";

export interface TopologyState {
  nodes: Node<TopologyNodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addComponent: (component: ComponentDef) => void;
}

export type TopologyStore = ReturnType<typeof createTopologyStore>;

export function createTopologyStore() {
  let nodeIdCounter = 0;

  return createStore<TopologyState>((set, get) => ({
    nodes: fixtureNodes,
    edges: fixtureEdges,
    onNodesChange: (changes) =>
      set({ nodes: applyNodeChanges(changes, get().nodes) }),
    onEdgesChange: (changes) =>
      set({ edges: applyEdgeChanges(changes, get().edges) }),
    onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),
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
        type: "default",
      };
      set({ nodes: [...get().nodes, newNode] });
    },
  }));
}
