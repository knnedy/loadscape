"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
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
} from "../../_store/topology-provider";
import {
  HISTORY_LIMIT,
  type AppNode,
  type AppEdge,
} from "../../_store/topology-store";
import { useAlignmentGuides } from "../../_hooks/use-alignment-guides";
import { AlignmentGuides } from "./alignment-guides";
import {
  CanvasContextMenu,
  type ContextMenuTarget,
} from "./canvas-context-menu";
import { SelectionToolbar } from "./selection-toolbar";

// Matches the 24px dots drawn by the canvas background.
const SNAP_GRID: [number, number] = [24, 24];

export function Canvas() {
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const onEdgesChange = useTopologyStore((s) => s.onEdgesChange);
  const onConnect = useTopologyStore((s) => s.onConnect);
  const reconnectEdge = useTopologyStore((s) => s.reconnectEdge);
  const selectNode = useTopologyStore((s) => s.selectNode);
  const selectEdge = useTopologyStore((s) => s.selectEdge);
  const selectOnly = useTopologyStore((s) => s.selectOnly);
  const selectedNodeId = useTopologyStore((s) => s.selectedNodeId);
  const deleteEdge = useTopologyStore((s) => s.deleteEdge);
  const duplicateNode = useTopologyStore((s) => s.duplicateNode);
  const deleteSelection = useTopologyStore((s) => s.deleteSelection);
  const syncSelection = useTopologyStore((s) => s.syncSelection);
  const reparentNode = useTopologyStore((s) => s.reparentNode);
  const showMiniMap = useTopologyStore((s) => s.showMiniMap);
  const snapToGrid = useTopologyStore((s) => s.snapToGrid);
  const storeApi = useTopologyStoreApi();

  const { guides, handleNodesChange, clearGuides } = useAlignmentGuides();

  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(
    null,
  );
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

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
      clearGuides();
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
    [
      clearGuides,
      getIntersectingNodes,
      getInternalNode,
      reparentNode,
      commitDragCheckpoint,
    ],
  );

  const onSelectionDragStop = useCallback(() => {
    clearGuides();
    commitDragCheckpoint();
  }, [clearGuides, commitDragCheckpoint]);

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

  // Right-clicking something selects it, unless it is already part of the
  // current selection, so a multi-selection survives the click.
  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: AppNode) => {
      event.preventDefault();
      if (!node.selected) selectOnly(node.id);
      setContextMenu({
        kind: "node",
        id: node.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [selectOnly],
  );

  const onEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: AppEdge) => {
      event.preventDefault();
      selectEdge(edge.id);
      setContextMenu({
        kind: "edge",
        id: edge.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [selectEdge],
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
        snapToGrid={snapToGrid}
        snapGrid={SNAP_GRID}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onReconnect={onEdgeUpdate}
        onReconnectStart={onEdgeUpdateStart}
        onReconnectEnd={onEdgeUpdateEnd}
        onNodeDragStart={beginDragCheckpoint}
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStart={beginDragCheckpoint}
        onSelectionDragStop={onSelectionDragStop}
        onSelectionChange={onSelectionChange}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
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
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="var(--canvas-dot)"
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
        <AlignmentGuides guides={guides} />
        <SelectionToolbar />
      </ReactFlow>
      <CanvasContextMenu target={contextMenu} onClose={closeContextMenu} />
    </div>
  );
}
