"use client";

import { useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { Activity, Ban } from "lucide-react";
import type { TopologyEdgeData, TopologyNodeData } from "@/lib/types/topology";
import {
  DOWNSTREAM_FAILURE,
  failureTints,
  strokeWidthFor,
} from "@/lib/simulation/flow-visuals";
import { cn } from "@/lib/utils";
import { useThrottledSimulation } from "@/app/projects/[id]/_hooks/use-throttled-simulation";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";
import { useRegisterEdgeGeometry } from "./edge-geometry";
import { useEdgeRoute } from "./edge-routes";

type ComponentEdgeType = Edge<TopologyEdgeData, "component">;

const BADGE_OFFSET = 22;

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

  const flow =
    useThrottledSimulation((s) => s.frame?.edges[id] ?? null) ?? null;

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

  const colorVar = sourceCategory
    ? `--cat-${sourceCategory}`
    : "--border-strong";
  useRegisterEdgeGeometry(id, path, colorVar);

  const isAsync = data?.style === "async";
  const edgeColor = `var(${colorVar})`;

  // An open breaker passes nothing, and a half-open one is probing.
  const breaker = flow?.breaker ?? "off";
  const open = breaker === "open";
  const probing = breaker === "half-open";

  const tints = flow
    ? failureTints(flow.flow, flow.failed, flow.rejected)
    : null;
  const withDownstream =
    tints && tints.downstream > 0
      ? `color-mix(in oklch, ${DOWNSTREAM_FAILURE} ${tints.downstream}%, ${edgeColor})`
      : edgeColor;
  const flowColor =
    tints && tints.rejected > 0
      ? `color-mix(in oklch, var(--destructive) ${tints.rejected}%, ${withDownstream})`
      : withDownstream;
  const breakerColor = open
    ? "var(--muted-foreground)"
    : probing
      ? DOWNSTREAM_FAILURE
      : flowColor;
  const stroke = selected ? "var(--primary)" : breakerColor;
  const width = strokeWidthFor(flow?.flow ?? 0) + (selected ? 0.5 : 0);

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
        className={probing ? "animate-pulse" : undefined}
        style={{
          stroke,
          strokeWidth: width,
          strokeDasharray: open ? "2 5" : isAsync ? "6 4" : undefined,
          strokeLinecap: open ? "round" : undefined,
          filter: `drop-shadow(0 0 ${selected ? 4 : 2.5}px color-mix(in oklch, ${stroke} ${
            selected ? 65 : 45
          }%, transparent))`,
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
        {(open || probing) && (
          <div
            className="pointer-events-none absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${
                labelY + (data?.label ? BADGE_OFFSET : 0)
              }px)`,
            }}>
            <span
              className={cn(
                "flex items-center gap-1 rounded-md border bg-card px-1.5 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap uppercase shadow-sm",
                open
                  ? "border-destructive/40 text-destructive"
                  : "border-amber-500/40 text-amber-600 dark:text-amber-400",
              )}>
              {open ? <Ban size={10} /> : <Activity size={10} />}
              {open ? "open" : "half-open"}
            </span>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
