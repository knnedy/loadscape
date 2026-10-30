import {
  addEdge,
  applyEdgeChanges,
  MarkerType,
  reconnectEdge,
  type Connection,
  type Edge,
  type EdgeChange,
} from "@xyflow/react";
import type { StateCreator } from "zustand";
import type {
  EdgeDirection,
  EdgeStyle,
  TopologyEdgeData,
} from "@/lib/types/topology";
import type { TopologyTemporal } from "../temporal";
import type { AppEdge, TopologyState } from "../topology-store";

export type EdgeRetryPatch = Partial<
  Pick<TopologyEdgeData, "retries" | "backoffMs">
>;

export type EdgeBreakerPatch = Partial<
  Pick<TopologyEdgeData, "breakerThreshold" | "breakerCooldownMs">
>;

type EdgeConfigPatch = EdgeRetryPatch &
  EdgeBreakerPatch &
  Partial<Pick<TopologyEdgeData, "share">>;

// An undefined value removes the key, so stored data keeps only the values
// a user changed and every other connection uses the defaults.
function withEdgeConfig(
  data: TopologyEdgeData,
  patch: EdgeConfigPatch,
): TopologyEdgeData {
  const next: Record<string, unknown> = { ...data };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  return next as TopologyEdgeData;
}

export function markersForDirection(direction: EdgeDirection) {
  const arrow = { type: MarkerType.ArrowClosed };
  return {
    markerEnd:
      direction === "forward" || direction === "bidirectional"
        ? arrow
        : undefined,
    markerStart: direction === "bidirectional" ? arrow : undefined,
  };
}

export interface EdgesSlice {
  edges: AppEdge[];
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  reconnectEdge: (
    oldEdge: Edge<TopologyEdgeData>,
    newConnection: Connection,
  ) => void;
  deleteEdge: (id: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  updateEdgeStyle: (id: string, style: EdgeStyle) => void;
  updateEdgeDirection: (id: string, direction: EdgeDirection) => void;
  updateEdgeShare: (id: string, share: number | undefined) => void;
  updateEdgeRetry: (id: string, patch: EdgeRetryPatch) => void;
  updateEdgeBreaker: (id: string, patch: EdgeBreakerPatch) => void;
  updateSelectedEdges: (patch: {
    style?: EdgeStyle;
    direction?: EdgeDirection;
  }) => void;
}

export const createEdgesSlice =
  (
    initialEdges: AppEdge[],
  ): StateCreator<TopologyState, [["temporal", unknown]], [], EdgesSlice> =>
  (set, get, api) => ({
    edges: initialEdges,
    onEdgesChange: (changes) => {
      const temporal = (api.temporal as TopologyTemporal).getState();
      const cosmeticOnly = changes.every((c) => c.type === "select");
      const wasTracking = cosmeticOnly ? temporal.isTracking : false;
      if (cosmeticOnly && wasTracking) temporal.pause();
      set({ edges: applyEdgeChanges<AppEdge>(changes, get().edges) });
      if (cosmeticOnly && wasTracking) temporal.resume();
    },
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
    reconnectEdge: (oldEdge, newConnection) =>
      set({ edges: reconnectEdge(oldEdge, newConnection, get().edges) }),
    deleteEdge: (id) =>
      set({
        edges: get().edges.filter((e) => e.id !== id),
        selectedEdgeId:
          get().selectedEdgeId === id ? null : get().selectedEdgeId,
        inspected: get().inspected?.id === id ? null : get().inspected,
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
    updateEdgeShare: (id, share) =>
      set({
        edges: get().edges.map((e) =>
          e.id === id ? { ...e, data: withEdgeConfig(e.data!, { share }) } : e,
        ),
      }),
    updateEdgeRetry: (id, patch) =>
      set({
        edges: get().edges.map((e) =>
          e.id === id ? { ...e, data: withEdgeConfig(e.data!, patch) } : e,
        ),
      }),
    updateEdgeBreaker: (id, patch) =>
      set({
        edges: get().edges.map((e) =>
          e.id === id ? { ...e, data: withEdgeConfig(e.data!, patch) } : e,
        ),
      }),
    updateSelectedEdges: (patch) =>
      set({
        edges: get().edges.map((edge) => {
          if (!edge.selected) return edge;
          const data = {
            ...edge.data!,
            ...(patch.style ? { style: patch.style } : {}),
            ...(patch.direction ? { direction: patch.direction } : {}),
          };
          return patch.direction
            ? { ...edge, data, ...markersForDirection(patch.direction) }
            : { ...edge, data };
        }),
      }),
  });
