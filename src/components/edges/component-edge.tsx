"use client";

import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "reactflow";
import type { TopologyEdgeData } from "@/lib/types/topology";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";

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
}: EdgeProps<TopologyEdgeData>) {
  const updateEdgeLabel = useTopologyStore((s) => s.updateEdgeLabel);
  const allEdges = useTopologyStore((s) => s.edges);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data?.label ?? "");

  const siblings = allEdges.filter(
    (e) =>
      (e.source === source && e.target === target) ||
      (e.source === target && e.target === source),
  );
  const index = siblings.findIndex((e) => e.id === id);
  const offset =
    siblings.length > 1 ? (index - (siblings.length - 1) / 2) * 28 : 0;

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    centerY: (sourceY + targetY) / 2 + offset,
    borderRadius: 8,
  });

  const isAsync = data?.style === "async";

  function commit() {
    updateEdgeLabel(id, draft.trim());
    setEditing(false);
  }

  return (
    <>
      <BaseEdge
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "var(--primary)" : "var(--border)",
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: isAsync ? "6 4" : undefined,
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
            setEditing(true);
          }}>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
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
