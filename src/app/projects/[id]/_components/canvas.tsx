"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  type Connection,
  type Edge,
} from "reactflow";
import { ComponentNode } from "@/components/nodes/component-node";
import { ComponentEdge } from "@/components/edges/component-edge";
import { isConnectionValid } from "@/lib/topology-validation";
import { useTopologyStore } from "../_store/topology-provider";

export function Canvas() {
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

  const nodeTypes = useMemo(() => ({ component: ComponentNode }), []);
  const edgeTypes = useMemo(() => ({ component: ComponentEdge }), []);

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
    (oldEdge: Edge, newConnection: Connection) => {
      if (!isConnectionValid(newConnection, edges, oldEdge.id)) return;
      edgeUpdateSuccessful.current = true;
      reconnectEdge(oldEdge, newConnection);
    },
    [edges, reconnectEdge],
  );

  const onEdgeUpdateEnd = useCallback(
    (_: unknown, edge: Edge) => {
      if (!edgeUpdateSuccessful.current) {
        deleteEdge(edge.id);
      }
      edgeUpdateSuccessful.current = true;
    },
    [deleteEdge],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selectedNodeId) deleteNode(selectedNodeId);
      if (selectedEdgeId) deleteEdge(selectedEdgeId);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge]);

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
        onEdgeUpdate={onEdgeUpdate}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgeUpdateEnd={onEdgeUpdateEnd}
        onNodeClick={(_, node) => selectNode(node.id)}
        onEdgeClick={(_, edge) => selectEdge(edge.id)}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
        }}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.4 }}>
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="var(--canvas-dot)"
        />
        <Controls
          position="bottom-right"
          className="border border-border bg-card [&_button]:border-border [&_button]:bg-card [&_button]:text-foreground [&_button:hover]:bg-accent [&_svg]:fill-current"
        />
      </ReactFlow>
    </div>
  );
}
