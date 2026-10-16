export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GuideLine {
  // Where the line sits across its axis, then the span it covers along it.
  position: number;
  from: number;
  to: number;
}

export interface Guides {
  vertical: GuideLine | null;
  horizontal: GuideLine | null;
}

export interface AlignmentResult {
  dx: number;
  dy: number;
  guides: Guides;
}

type Axis = "x" | "y";

const MATCH_EPSILON = 0.5;

// Start, middle and end of a box along an axis.
function anchors(box: Box, axis: Axis) {
  const start = axis === "x" ? box.x : box.y;
  const size = axis === "x" ? box.width : box.height;
  return [start, start + size / 2, start + size];
}

function bestSnap(moving: Box, others: Box[], axis: Axis, threshold: number) {
  const movingAnchors = anchors(moving, axis);
  let best: { delta: number; position: number } | null = null;

  for (const other of others) {
    for (const target of anchors(other, axis)) {
      for (const anchor of movingAnchors) {
        const delta = target - anchor;
        if (
          Math.abs(delta) <= threshold &&
          (best === null || Math.abs(delta) < Math.abs(best.delta))
        ) {
          best = { delta, position: target };
        }
      }
    }
  }
  return best;
}

// The line spans the moved box plus every box sharing the snapped position.
function guideLine(
  position: number,
  axis: Axis,
  snapped: Box,
  others: Box[],
): GuideLine {
  const crossStart = (box: Box) => (axis === "x" ? box.y : box.x);
  const crossEnd = (box: Box) =>
    axis === "x" ? box.y + box.height : box.x + box.width;

  const matches = others.filter((other) =>
    anchors(other, axis).some(
      (anchor) => Math.abs(anchor - position) < MATCH_EPSILON,
    ),
  );

  return {
    position,
    from: Math.min(crossStart(snapped), ...matches.map(crossStart)),
    to: Math.max(crossEnd(snapped), ...matches.map(crossEnd)),
  };
}

export function computeAlignment(
  moving: Box,
  others: Box[],
  threshold: number,
): AlignmentResult {
  const snapX = bestSnap(moving, others, "x", threshold);
  const snapY = bestSnap(moving, others, "y", threshold);

  const dx = snapX?.delta ?? 0;
  const dy = snapY?.delta ?? 0;
  const snapped: Box = { ...moving, x: moving.x + dx, y: moving.y + dy };

  return {
    dx,
    dy,
    guides: {
      vertical: snapX ? guideLine(snapX.position, "x", snapped, others) : null,
      horizontal: snapY
        ? guideLine(snapY.position, "y", snapped, others)
        : null,
    },
  };
}
