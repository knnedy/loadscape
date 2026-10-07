"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ConnectionMode,
  useReactFlow,
  type Connection,
  type Edge,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import { ComponentNode } from "@/components/nodes/component-node";
import { GroupNode } from "@/components/nodes/group-node";
import { NoteNode } from "@/components/nodes/note-node";
import { ComponentEdge } from "@/components/edges/component-edge";
import { isConnectionValid } from "@/lib/topology-validation";
import {
  useTopologyStore,
  useTopologyStoreApi,
} from "../_store/topology-provider";
import {
  HISTORY_LIMIT,
  type AppNode,
  type AppEdge,
} from "../_store/topology-store";

export function Canvas() {
  const SNAP_GRID: [number, number] = [24, 24];

  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const onNodesChange = useTopologyStore((s) => s.onNodesChange);
  const onEdgesChange = useTopologyStore((s) => s.onEdgesChange);
  const onConnect = useTopologyStore((s) => s.onConnect);
  const reconnectEdge = useTopologyStore((s) => s.reconnectEdge);
  const selectNode = useTopologyStore((s) => s.selectNode);
  const selectEdge = useTopologyStore((s) => s.selectEdge);
  const selectedNodeId = useTopologyStore((s) => s.selectedNodeId);
  const selectedEdgeId = useTopologyStore((s) => s.selectedEdgeId);
  const deleteNode = useTopologyStore((s) => s.deleteNode);
  const deleteEdge = useTopologyStore((s) => s.deleteEdge);
  const duplicateNode = useTopologyStore((s) => s.duplicateNode);
  const deleteSelection = useTopologyStore((s) => s.deleteSelection);
  const syncSelection = useTopologyStore((s) => s.syncSelection);
  const reparentNode = useTopologyStore((s) => s.reparentNode);
  const showMiniMap = useTopologyStore((s) => s.showMiniMap);
  const snapToGrid = useTopologyStore((s) => s.snapToGrid);
  const storeApi = useTopologyStoreApi();

  const nodeTypes = useMemo(
    () => ({
      component: ComponentNode,
      "group-container": GroupNode,
      note: NoteNode,
    }),
    [],
  );
  const edgeTypes = useMemo(() => ({ component: ComponentEdge }), []);

  const { getIntersectingNodes, getInternalNode } = useReactFlow();

  const isValidConnection = useCallback(
    (connection: Connection | Edge) =>
      isConnectionValid(connection as Connection, edges),
    [edges],
  );

  const edgeUpdateSuccessful = useRef(true);
  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);
  const onEdgeUpdate = useCallback(
    (oldEdge: AppEdge, newConnection: Connection) => {
      if (!isConnectionValid(newConnection, edges, oldEdge.id)) return;
      edgeUpdateSuccessful.current = true;
      reconnectEdge(oldEdge, newConnection);
    },
    [edges, reconnectEdge],
  );
  const onEdgeUpdateEnd = useCallback(
    (_: unknown, edge: AppEdge) => {
      if (!edgeUpdateSuccessful.current) deleteEdge(edge.id);
      edgeUpdateSuccessful.current = true;
    },
    [deleteEdge],
  );

  const dragSnapshotRef = useRef<{ nodes: AppNode[]; edges: AppEdge[] } | null>(
    null,
  );

  const beginDragCheckpoint = useCallback(() => {
    if (dragSnapshotRef.current) return;
    dragSnapshotRef.current = {
      nodes: storeApi.getState().nodes,
      edges: storeApi.getState().edges,
    };
    storeApi.temporal.getState().pause();
  }, [storeApi]);

  const commitDragCheckpoint = useCallback(() => {
    const snapshot = dragSnapshotRef.current;
    dragSnapshotRef.current = null;
    if (!snapshot) return;

    const current = storeApi.getState();
    const unchanged =
      JSON.stringify(snapshot.nodes) === JSON.stringify(current.nodes) &&
      JSON.stringify(snapshot.edges) === JSON.stringify(current.edges);

    storeApi.temporal.getState().resume();
    if (unchanged) return;

    storeApi.temporal.setState((s) => ({
      pastStates: [...s.pastStates, snapshot].slice(-HISTORY_LIMIT),
      futureStates: [],
    }));
  }, [storeApi]);

  const onNodeDragStop = useCallback(
    (_: unknown, node: AppNode) => {
      if (node.type !== "group-container") {
        const overlappingGroup = getIntersectingNodes(node).find(
          (n) => n.type === "group-container",
        );
        const internalNode = getInternalNode(node.id);
        const absolutePosition =
          internalNode?.internals.positionAbsolute ?? node.position;
        reparentNode(node.id, overlappingGroup?.id ?? null, absolutePosition);
      }
      commitDragCheckpoint();
    },
    [getIntersectingNodes, getInternalNode, reparentNode, commitDragCheckpoint],
  );

  const onSelectionChange = useCallback<
    OnSelectionChangeFunc<AppNode, AppEdge>
  >(
    ({ nodes, edges }) =>
      syncSelection(
        nodes.map((n) => n.id),
        edges.map((e) => e.id),
      ),
    [syncSelection],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedNodeId) duplicateNode(selectedNodeId);
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;
      deleteSelection();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, duplicateNode, deleteSelection]);

  return (
    <div className="h-full w-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onReconnect={onEdgeUpdate}
        onReconnectStart={onEdgeUpdateStart}
        onReconnectEnd={onEdgeUpdateEnd}
        onNodeDragStart={beginDragCheckpoint}
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStart={beginDragCheckpoint}
        onSelectionDragStop={commitDragCheckpoint}
        onSelectionChange={onSelectionChange}
        deleteKeyCode={null}
        onNodeClick={(_, node) => selectNode(node.id)}
        onEdgeClick={(_, edge) => selectEdge(edge.id)}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
        }}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.4 }}
        connectionMode={ConnectionMode.Loose}>
        <Background
          id="grid-major"
          variant={BackgroundVariant.Lines}
          gap={120}
          lineWidth={1}
          color="color-mix(in oklch, var(--canvas-dot) 35%, transparent)"
        />
        <Background
          id="grid-minor"
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="var(--canvas-dot)"
        />
        <Controls
          position="bottom-right"
          className="border border-border bg-card [&_button]:border-border [&_button]:bg-card [&_button]:text-foreground [&_button:hover]:bg-accent [&_svg]:fill-current"
        />
        {showMiniMap && (
          <MiniMap
            position="bottom-left"
            className="border border-border! bg-card!"
            maskColor="rgba(0,0,0,0.5)"
            nodeColor={(node) => {
              if (node.type === "group-container") return "transparent";
              const category = (node.data as { category?: string }).category;
              return category
                ? `var(--cat-${category})`
                : "var(--muted-foreground)";
            }}
            nodeStrokeColor="var(--border)"
            nodeStrokeWidth={2}
            pannable
            zoomable
          />
        )}
        snapToGrid={snapToGrid}
        snapGrid={SNAP_GRID}
      </ReactFlow>
    </div>
  );
}
