"use client";

import { useEffect, useMemo } from "react";
import ReactFlow, { Background, BackgroundVariant, Controls } from "reactflow";
import { ComponentNode } from "@/components/nodes/component-node";
import { useTopologyStore } from "../_store/topology-provider";

export function Canvas() {
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const onNodesChange = useTopologyStore((s) => s.onNodesChange);
  const onEdgesChange = useTopologyStore((s) => s.onEdgesChange);
  const onConnect = useTopologyStore((s) => s.onConnect);
  const selectNode = useTopologyStore((s) => s.selectNode);
  const selectedNodeId = useTopologyStore((s) => s.selectedNodeId);
  const deleteNode = useTopologyStore((s) => s.deleteNode);

  const nodeTypes = useMemo(() => ({ component: ComponentNode }), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        deleteNode(selectedNodeId);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, deleteNode]);

  return (
    <div className="h-full w-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
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
