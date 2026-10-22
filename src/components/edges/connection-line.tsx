"use client";

import {
  getSmoothStepPath,
  type ConnectionLineComponentProps,
} from "@xyflow/react";
import type { TopologyNodeData } from "@/lib/types/topology";

const FALLBACK_COLOR = "var(--border-strong)";

export function ConnectionLine({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition,
  fromNode,
  toNode,
  fromHandle,
}: ConnectionLineComponentProps) {
  // The finished edge takes its colour from its source node, which is the
  // node being dropped on when the drag starts from an input handle.
  const sourceNode = fromHandle?.type === "target" ? toNode : fromNode;
  const category =
    sourceNode && "category" in sourceNode.data
      ? (sourceNode.data as TopologyNodeData).category
      : undefined;
  const color = category ? `var(--cat-${category})` : FALLBACK_COLOR;

  const [path] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: 8,
  });

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        style={{
          filter: `drop-shadow(0 0 2.5px color-mix(in oklch, ${color} 45%, transparent))`,
        }}
      />
      <circle cx={toX} cy={toY} r={3} fill={color} />
    </g>
  );
}
