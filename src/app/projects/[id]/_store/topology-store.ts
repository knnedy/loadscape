import { createStore } from "zustand/vanilla";
import { temporal } from "zundo";
import type { Edge, Node } from "@xyflow/react";
import type {
  TopologyEdgeData,
  TopologyGroupData,
  TopologyNodeData,
  TopologyNoteData,
} from "@/lib/types/topology";
import { createIdCounters } from "./id-counters";
import {
  createAnnotationsSlice,
  type AnnotationsSlice,
} from "./slices/annotations-slice";
import { createDiagramSlice, type DiagramSlice } from "./slices/diagram-slice";
import { createEdgesSlice, type EdgesSlice } from "./slices/edges-slice";
import { createNodesSlice, type NodesSlice } from "./slices/nodes-slice";
import {
  createSelectionSlice,
  type SelectionSlice,
} from "./slices/selection-slice";
import { createViewSlice, type ViewSlice } from "./slices/view-slice";

// Shared with the canvas's drag-checkpoint logic, so both sides agree on
// how many history entries to retain.
export const HISTORY_LIMIT = 50;

export type AppNode = Node<
  TopologyNodeData | TopologyGroupData | TopologyNoteData
>;
export type AppEdge = Edge<TopologyEdgeData>;

export type InspectedTarget = { kind: "node" | "edge"; id: string };

export interface InitialTopology {
  nodes: AppNode[];
  edges: AppEdge[];
}

export type TopologyState = NodesSlice &
  EdgesSlice &
  SelectionSlice &
  AnnotationsSlice &
  DiagramSlice &
  ViewSlice;

export type TopologyStore = ReturnType<typeof createTopologyStore>;

export function createTopologyStore(
  initial: InitialTopology = { nodes: [], edges: [] },
) {
  const counters = createIdCounters(initial.nodes);

  return createStore<TopologyState>()(
    temporal(
      (...args) => ({
        ...createNodesSlice(initial.nodes, counters)(...args),
        ...createEdgesSlice(initial.edges)(...args),
        ...createSelectionSlice(...args),
        ...createAnnotationsSlice(counters)(...args),
        ...createDiagramSlice(counters)(...args),
        ...createViewSlice(...args),
      }),
      {
        limit: HISTORY_LIMIT,
        partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
        // Without this, zundo records a history entry on every `set`, even
        // ones that leave nodes and edges untouched (selection, minimap).
        equality: (past, current) =>
          past.nodes === current.nodes && past.edges === current.edges,
        // No handleSet override — drag-gesture coalescing is handled
        // explicitly by the canvas via pause/resume and a single manual
        // checkpoint, not by timing.
      },
    ),
  );
}
