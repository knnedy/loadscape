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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data?.label ?? "");

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
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
