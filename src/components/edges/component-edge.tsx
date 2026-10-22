"use client";

import { useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import type { TopologyEdgeData, TopologyNodeData } from "@/lib/types/topology";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";
import { useEdgeRoute } from "./edge-routes";

type ComponentEdgeType = Edge<TopologyEdgeData, "component">;

export function ComponentEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerStart,
  markerEnd,
  data,
  selected,
}: EdgeProps<ComponentEdgeType>) {
  const updateEdgeLabel = useTopologyStore((s) => s.updateEdgeLabel);
  const readOnly = useTopologyStore((s) => s.readOnly);

  // Parallel edges between the same two nodes are spread apart.
  const offset = useTopologyStore((s) => {
    const siblings = s.edges.filter(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source),
    );
    if (siblings.length < 2) return 0;
    const index = siblings.findIndex((e) => e.id === id);
    return (index - (siblings.length - 1) / 2) * 28;
  });

  const sourceCategory = useTopologyStore((s) => {
    const node = s.nodes.find((n) => n.id === source);
    return node && "category" in node.data
      ? (node.data as TopologyNodeData).category
      : undefined;
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data?.label ?? "");
  // Enter and blur can both fire; only the first one counts.
  const settledRef = useRef(false);

  const { path, labelX, labelY } = useEdgeRoute({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    offset,
  });

  const isAsync = data?.style === "async";
  const edgeColor = sourceCategory
    ? `var(--cat-${sourceCategory})`
    : "var(--border-strong)";

  function startEditing() {
    settledRef.current = false;
    setDraft(data?.label ?? "");
    setEditing(true);
  }

  function cancel() {
    settledRef.current = true;
    setEditing(false);
  }

  function commit() {
    if (settledRef.current) return;
    settledRef.current = true;
    const next = draft.trim();
    if (next !== (data?.label ?? "")) updateEdgeLabel(id, next);
    setEditing(false);
  }

  return (
    <>
      <BaseEdge
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "var(--primary)" : edgeColor,
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: isAsync ? "6 4" : undefined,
          filter: `drop-shadow(0 0 ${selected ? 4 : 2.5}px color-mix(in oklch, ${
            selected ? "var(--primary)" : edgeColor
          } ${selected ? 65 : 45}%, transparent))`,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (!readOnly) startEditing();
          }}>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              aria-label="Connection label"
              className="w-28 rounded-md border border-border bg-card px-1.5 py-0.5 text-center text-[11px] text-foreground outline-none"
            />
          ) : (
            data?.label && (
              <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] whitespace-nowrap text-muted-foreground shadow-sm">
                {data.label}
              </span>
            )
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
