import type { StateCreator } from "zustand";
import type { InspectedTarget, TopologyState } from "../topology-store";

export interface SelectionSlice {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  inspected: InspectedTarget | null;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  selectOnly: (id: string) => void;
  syncSelection: (nodeIds: string[], edgeIds: string[]) => void;
  deleteSelection: () => void;
}

export const createSelectionSlice: StateCreator<
  TopologyState,
  [["temporal", unknown]],
  [],
  SelectionSlice
> = (set, get) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  inspected: null,
  selectNode: (id) =>
    set({
      selectedNodeId: id,
      selectedEdgeId: null,
      inspected: id ? { kind: "node", id } : null,
    }),
  selectEdge: (id) =>
    set({
      selectedEdgeId: id,
      selectedNodeId: null,
      inspected: id ? { kind: "edge", id } : null,
    }),
  // Selects one node the way a canvas click would: React Flow's own
  // `selected` flags (for the node's halo) plus the store id (for the
  // config panel). Selection-only changes stay out of the undo history.
  selectOnly: (id) => {
    const { nodes, edges } = get();
    get().onNodesChange(
      nodes.map((n) => ({
        type: "select" as const,
        id: n.id,
        selected: n.id === id,
      })),
    );
    const selectedEdges = edges.filter((e) => e.selected);
    if (selectedEdges.length > 0) {
      get().onEdgesChange(
        selectedEdges.map((e) => ({
          type: "select" as const,
          id: e.id,
          selected: false,
        })),
      );
    }
    set({
      selectedNodeId: id,
      selectedEdgeId: null,
      inspected: { kind: "node", id },
    });
  },
  // React Flow reports selection changes for drags as well as clicks,
  // so this may close the inspector but never opens it.
  syncSelection: (nodeIds, edgeIds) => {
    const nextNodeId =
      nodeIds.length === 1 && edgeIds.length === 0 ? nodeIds[0] : null;
    const nextEdgeId =
      edgeIds.length === 1 && nodeIds.length === 0 ? edgeIds[0] : null;
    const { selectedNodeId, selectedEdgeId, inspected } = get();
    const inspectedStillSelected =
      inspected !== null &&
      (inspected.kind === "node" ? nodeIds : edgeIds).includes(inspected.id);
    const nextInspected = inspectedStillSelected ? inspected : null;
    if (
      nextNodeId === selectedNodeId &&
      nextEdgeId === selectedEdgeId &&
      nextInspected === inspected
    )
      return;
    set({
      selectedNodeId: nextNodeId,
      selectedEdgeId: nextEdgeId,
      inspected: nextInspected,
    });
  },
  deleteSelection: () => {
    const { nodes, edges, selectedNodeId, selectedEdgeId } = get();
    const removedNodeIds = new Set(
      nodes.filter((n) => n.selected).map((n) => n.id),
    );
    const removedEdgeIds = new Set(
      edges.filter((e) => e.selected).map((e) => e.id),
    );
    if (removedNodeIds.size === 0 && removedEdgeIds.size === 0) {
      if (selectedNodeId) removedNodeIds.add(selectedNodeId);
      if (selectedEdgeId) removedEdgeIds.add(selectedEdgeId);
    }
    if (removedNodeIds.size === 0 && removedEdgeIds.size === 0) return;

    const removedGroups = new Map(
      nodes
        .filter((n) => n.type === "group-container" && removedNodeIds.has(n.id))
        .map((n) => [n.id, n]),
    );

    // Children of a deleted group survive (un-parented to absolute
    // coords) unless they're selected too.
    const nextNodes = nodes
      .filter((n) => !removedNodeIds.has(n.id))
      .map((n) => {
        const group = n.parentId ? removedGroups.get(n.parentId) : null;
        if (!group) return n;
        const { parentId, extent, ...rest } = n;
        return {
          ...rest,
          position: {
            x: n.position.x + group.position.x,
            y: n.position.y + group.position.y,
          },
        };
      });

    const nextEdges = edges.filter(
      (e) =>
        !removedEdgeIds.has(e.id) &&
        !removedNodeIds.has(e.source) &&
        !removedNodeIds.has(e.target),
    );

    set({
      nodes: nextNodes,
      edges: nextEdges,
      selectedNodeId: null,
      selectedEdgeId: null,
      inspected: null,
    });
  },
});
