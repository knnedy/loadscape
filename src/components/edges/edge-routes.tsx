"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Position } from "@xyflow/react";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";
import type { AppNode } from "@/app/projects/[id]/_store/topology-store";
import { routeEdge, type Rect, type Side } from "@/lib/edge-routing/route-edge";
import {
  defaultPolyline,
  polylineHitsAny,
  roundedPath,
  type RoutedPath,
} from "@/lib/edge-routing/route-path";

const FALLBACK_WIDTH = 160;
const FALLBACK_HEIGHT = 70;
const MAX_PARENT_DEPTH = 16;

const SIDE: Record<Position, Side> = {
  [Position.Left]: "left",
  [Position.Right]: "right",
  [Position.Top]: "top",
  [Position.Bottom]: "bottom",
};

function sizeOf(node: AppNode) {
  const styleWidth =
    typeof node.style?.width === "number" ? node.style.width : undefined;
  const styleHeight =
    typeof node.style?.height === "number" ? node.style.height : undefined;
  return {
    width: node.measured?.width ?? node.width ?? styleWidth ?? FALLBACK_WIDTH,
    height:
      node.measured?.height ?? node.height ?? styleHeight ?? FALLBACK_HEIGHT,
  };
}

// Edges route around components and notes. Groups are containers that edges
// legitimately cross, so they are not obstacles. The result is a string so
// the store selector only changes when a box actually moves or resizes.
function obstacleSignature(nodes: AppNode[]): string {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  function absolutePosition(node: AppNode) {
    let x = node.position.x;
    let y = node.position.y;
    let parent = node.parentId ? byId.get(node.parentId) : undefined;
    for (let depth = 0; parent && depth < MAX_PARENT_DEPTH; depth++) {
      x += parent.position.x;
      y += parent.position.y;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return { x, y };
  }

  const rects: Rect[] = [];
  for (const node of nodes) {
    if (node.type === "group-container") continue;
    const { x, y } = absolutePosition(node);
    const { width, height } = sizeOf(node);
    rects.push({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    });
  }
  return JSON.stringify(rects);
}

const EdgeObstaclesContext = createContext<Rect[]>([]);

export function EdgeRoutesProvider({ children }: { children: ReactNode }) {
  const signature = useTopologyStore((s) => obstacleSignature(s.nodes));
  const obstacles = useMemo<Rect[]>(() => JSON.parse(signature), [signature]);

  return (
    <EdgeObstaclesContext.Provider value={obstacles}>
      {children}
    </EdgeObstaclesContext.Provider>
  );
}

export interface EdgeRouteParams {
  sourceX: number;
  sourceY: number;
  sourcePosition: Position;
  targetX: number;
  targetY: number;
  targetPosition: Position;
  // Spreads parallel edges between the same two nodes.
  offset: number;
}

export function useEdgeRoute({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  offset,
}: EdgeRouteParams): RoutedPath {
  const obstacles = useContext(EdgeObstaclesContext);

  return useMemo(() => {
    // The offset moves the middle segment of the stepped path: the vertical
    // one for edges that leave sideways, the horizontal one otherwise.
    const sideways =
      sourcePosition === Position.Left || sourcePosition === Position.Right;
    const lane =
      offset === 0
        ? {}
        : sideways
          ? { centerX: (sourceX + targetX) / 2 + offset }
          : { centerY: (sourceY + targetY) / 2 + offset };

    const base = defaultPolyline({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      ...lane,
    });

    if (base.length >= 2 && !polylineHitsAny(base, obstacles)) {
      return roundedPath(base);
    }

    const routed = routeEdge(
      { point: { x: sourceX, y: sourceY }, side: SIDE[sourcePosition] },
      { point: { x: targetX, y: targetY }, side: SIDE[targetPosition] },
      obstacles,
    );

    const points = routed ?? base;
    return roundedPath(
      points.length >= 2
        ? points
        : [
            { x: sourceX, y: sourceY },
            { x: targetX, y: targetY },
          ],
    );
  }, [
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    offset,
    obstacles,
  ]);
}
