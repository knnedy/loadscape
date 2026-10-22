import { getSmoothStepPath } from "@xyflow/react";
import type { Point, Rect } from "./route-edge";

type SmoothStepParams = Parameters<typeof getSmoothStepPath>[0];

export interface RoutedPath {
  path: string;
  labelX: number;
  labelY: number;
}

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

// The corner points of the stepped path React Flow would draw. With a zero
// radius every curve collapses onto its corner, so the numbers in the path
// string are the polyline's points, repeated.
export function defaultPolyline(params: SmoothStepParams): Point[] {
  const [path] = getSmoothStepPath({ ...params, borderRadius: 0 });
  const numbers = (path.match(NUMBER) ?? []).map(Number);

  const points: Point[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const point = { x: numbers[i], y: numbers[i + 1] };
    const last = points[points.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y) points.push(point);
  }
  return points;
}

export function inflateRect(rect: Rect, by: number): Rect {
  return {
    x: rect.x - by,
    y: rect.y - by,
    width: rect.width + by * 2,
    height: rect.height + by * 2,
  };
}

// True when any segment passes through the inside of a rectangle. Running
// along or touching a boundary does not count.
export function polylineHitsAny(points: Point[], rects: Rect[]): boolean {
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);

    for (const rect of rects) {
      const outside =
        maxX <= rect.x ||
        minX >= rect.x + rect.width ||
        maxY <= rect.y ||
        minY >= rect.y + rect.height;
      if (!outside) return true;
    }
  }
  return false;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function towards(from: Point, to: Point, amount: number): Point {
  const length = distance(from, to);
  if (length === 0) return from;
  return {
    x: from.x + ((to.x - from.x) / length) * amount,
    y: from.y + ((to.y - from.y) / length) * amount,
  };
}

function pointAlong(points: Point[], target: number): Point {
  let walked = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const length = distance(points[i], points[i + 1]);
    if (walked + length >= target) {
      return towards(points[i], points[i + 1], target - walked);
    }
    walked += length;
  }
  return points[points.length - 1];
}

// An SVG path through the polyline with rounded corners, and the point
// halfway along it for the label.
export function roundedPath(points: Point[], radius = 8): RoutedPath {
  const first = points[0];
  let path = `M${first.x} ${first.y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    const straight =
      (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
    const size = Math.min(distance(a, b) / 2, distance(b, c) / 2, radius);

    if (straight || size === 0) {
      path += `L${b.x} ${b.y}`;
      continue;
    }
    const entry = towards(b, a, size);
    const exit = towards(b, c, size);
    path += `L${entry.x} ${entry.y}Q${b.x} ${b.y} ${exit.x} ${exit.y}`;
  }

  const last = points[points.length - 1];
  if (points.length > 1) path += `L${last.x} ${last.y}`;

  let total = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    total += distance(points[i], points[i + 1]);
  }
  const label = pointAlong(points, total / 2);

  return { path, labelX: label.x, labelY: label.y };
}
