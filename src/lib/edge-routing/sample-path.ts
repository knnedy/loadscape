import type { Point } from "./route-edge";

export interface SampledPath {
  points: Point[];
  cumulative: number[];
  total: number;
}

const COMMAND = /([MLQ])([^MLQ]*)/g;
const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const CURVE_STEPS = 6;

function flattenCurve(from: Point, control: Point, to: Point): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS;
    const u = 1 - t;
    points.push({
      x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    });
  }
  return points;
}

// Parses the M, L and Q commands that roundedPath writes into points, with
// each curve flattened, so a position can be found by distance along the path.
export function samplePath(d: string): SampledPath {
  const points: Point[] = [];

  for (const match of d.matchAll(COMMAND)) {
    const numbers = (match[2].match(NUMBER) ?? []).map(Number);
    const last = points[points.length - 1];

    if (match[1] === "Q") {
      if (numbers.length < 4 || !last) continue;
      points.push(
        ...flattenCurve(
          last,
          { x: numbers[0], y: numbers[1] },
          { x: numbers[2], y: numbers[3] },
        ),
      );
    } else if (numbers.length >= 2) {
      points.push({ x: numbers[0], y: numbers[1] });
    }
  }

  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(
      cumulative[i - 1] +
        Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y,
        ),
    );
  }

  return { points, cumulative, total: cumulative[cumulative.length - 1] ?? 0 };
}

export function pointAt(path: SampledPath, distance: number): Point {
  const { points, cumulative, total } = path;
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1 || distance <= 0) return points[0];
  if (distance >= total) return points[points.length - 1];

  let low = 0;
  let high = cumulative.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (cumulative[middle] <= distance) low = middle;
    else high = middle;
  }

  const span = cumulative[high] - cumulative[low];
  const fraction = span === 0 ? 0 : (distance - cumulative[low]) / span;
  return {
    x: points[low].x + (points[high].x - points[low].x) * fraction,
    y: points[low].y + (points[high].y - points[low].y) * fraction,
  };
}
