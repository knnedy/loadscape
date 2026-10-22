export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Side = "left" | "right" | "top" | "bottom";

export interface Endpoint {
  point: Point;
  side: Side;
}

export interface RouteOptions {
  padding?: number;
  bendPenalty?: number;
  maxSteps?: number;
}

const DEFAULTS = { padding: 16, bendPenalty: 40, maxSteps: 60_000 };

const SIDE_VECTOR: Record<Side, Point> = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  bottom: { x: 0, y: 1 },
  top: { x: 0, y: -1 },
};

// Directions: 0 east, 1 west, 2 south, 3 north.
const SIDE_DIR: Record<Side, number> = { right: 0, left: 1, bottom: 2, top: 3 };
const DIR_DI = [1, -1, 0, 0];
const DIR_DJ = [0, 0, 1, -1];
const OPPOSITE = [1, 0, 3, 2];

const axisOf = (dir: number) => (dir < 2 ? 0 : 1);

function uniqueSorted(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.filter((value, i) => i === 0 || value !== sorted[i - 1]);
}

// Index of a value known to be in the sorted array.
function indexOf(sorted: number[], value: number) {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

class MinHeap {
  private items: number[] = [];
  private keys: number[] = [];

  get size() {
    return this.items.length;
  }

  push(item: number, key: number) {
    let i = this.items.length;
    this.items.push(item);
    this.keys.push(key);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= key) break;
      this.items[i] = this.items[parent];
      this.keys[i] = this.keys[parent];
      i = parent;
    }
    this.items[i] = item;
    this.keys[i] = key;
  }

  pop() {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastKey = this.keys.pop()!;
    const n = this.items.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let child = 2 * i + 1;
        if (child >= n) break;
        if (child + 1 < n && this.keys[child + 1] < this.keys[child]) child++;
        if (this.keys[child] >= lastKey) break;
        this.items[i] = this.items[child];
        this.keys[i] = this.keys[child];
        i = child;
      }
      this.items[i] = lastItem;
      this.keys[i] = lastKey;
    }
    return top;
  }
}

function simplify(points: Point[]) {
  const result: Point[] = [];
  for (const point of points) {
    const last = result[result.length - 1];
    if (last && last.x === point.x && last.y === point.y) continue;
    result.push(point);
    while (result.length >= 3) {
      const a = result[result.length - 3];
      const b = result[result.length - 2];
      const c = result[result.length - 1];
      const collinear =
        (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
      if (!collinear) break;
      result.splice(result.length - 2, 1);
    }
  }
  return result;
}

// Routes an orthogonal path from `source` to `target` around `obstacles`,
// which must include the source and target nodes themselves. Returns the
// polyline including both handle points, or null when no route is found.
export function routeEdge(
  source: Endpoint,
  target: Endpoint,
  obstacles: Rect[],
  options: RouteOptions = {},
): Point[] | null {
  const { padding, bendPenalty, maxSteps } = { ...DEFAULTS, ...options };

  // Handle positions can be a pixel or two off the node edge, so the stub
  // is slightly longer than the clearance to stay outside the padded box.
  const stub = padding + 2;
  const sv = SIDE_VECTOR[source.side];
  const tv = SIDE_VECTOR[target.side];
  const start = {
    x: source.point.x + sv.x * stub,
    y: source.point.y + sv.y * stub,
  };
  const end = {
    x: target.point.x + tv.x * stub,
    y: target.point.y + tv.y * stub,
  };

  const boxes = obstacles.map((r) => ({
    left: r.x - padding,
    right: r.x + r.width + padding,
    top: r.y - padding,
    bottom: r.y + r.height + padding,
  }));

  const xs = uniqueSorted([
    start.x,
    end.x,
    (start.x + end.x) / 2,
    ...boxes.flatMap((b) => [b.left, b.right]),
  ]);
  const ys = uniqueSorted([
    start.y,
    end.y,
    (start.y + end.y) / 2,
    ...boxes.flatMap((b) => [b.top, b.bottom]),
  ]);
  const cols = xs.length;
  const rows = ys.length;
  const index = (i: number, j: number) => j * cols + i;

  // A cell is blocked when it lies strictly inside a padded box, and a
  // segment is blocked when it runs through one. Touching a boundary is fine.
  const blocked = new Uint8Array(cols * rows);
  const hBlocked = new Uint8Array(cols * rows);
  const vBlocked = new Uint8Array(cols * rows);

  for (const box of boxes) {
    const iL = indexOf(xs, box.left);
    const iR = indexOf(xs, box.right);
    const jT = indexOf(ys, box.top);
    const jB = indexOf(ys, box.bottom);
    for (let j = jT + 1; j < jB; j++) {
      for (let i = iL; i < iR; i++) hBlocked[index(i, j)] = 1;
      for (let i = iL + 1; i < iR; i++) blocked[index(i, j)] = 1;
    }
    for (let i = iL + 1; i < iR; i++) {
      for (let j = jT; j < jB; j++) vBlocked[index(i, j)] = 1;
    }
  }

  const si = indexOf(xs, start.x);
  const sj = indexOf(ys, start.y);
  const ei = indexOf(xs, end.x);
  const ej = indexOf(ys, end.y);
  blocked[index(si, sj)] = 0;
  blocked[index(ei, ej)] = 0;

  const heuristic = (i: number, j: number) =>
    Math.abs(xs[i] - end.x) + Math.abs(ys[j] - end.y);

  const stateCount = cols * rows * 4;
  const cost = new Float64Array(stateCount).fill(Infinity);
  const cameFrom = new Int32Array(stateCount).fill(-1);
  const closed = new Uint8Array(stateCount);
  const heap = new MinHeap();

  const startDir = SIDE_DIR[source.side];
  const goalAxis = axisOf(SIDE_DIR[target.side]);
  const startState = index(si, sj) * 4 + startDir;
  cost[startState] = 0;
  heap.push(startState, heuristic(si, sj));

  let goalState = -1;
  let steps = 0;

  while (heap.size > 0) {
    if (++steps > maxSteps) return null;
    const state = heap.pop();
    if (closed[state]) continue;
    closed[state] = 1;

    const dir = state & 3;
    const cell = state >> 2;
    const i = cell % cols;
    const j = (cell - i) / cols;

    if (i === ei && j === ej) {
      goalState = state;
      break;
    }

    for (let d = 0; d < 4; d++) {
      if (d === OPPOSITE[dir]) continue;
      const ni = i + DIR_DI[d];
      const nj = j + DIR_DJ[d];
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      if (blocked[index(ni, nj)]) continue;

      const segmentBlocked =
        d === 0
          ? hBlocked[index(i, j)]
          : d === 1
            ? hBlocked[index(ni, j)]
            : d === 2
              ? vBlocked[index(i, j)]
              : vBlocked[index(i, nj)];
      if (segmentBlocked) continue;

      const next = index(ni, nj) * 4 + d;
      if (closed[next]) continue;

      const length = Math.abs(xs[ni] - xs[i]) + Math.abs(ys[nj] - ys[j]);
      const turn = axisOf(d) !== axisOf(dir) ? bendPenalty : 0;
      const arrival =
        ni === ei && nj === ej && axisOf(d) !== goalAxis ? bendPenalty : 0;
      const total = cost[state] + length + turn + arrival;

      if (total < cost[next]) {
        cost[next] = total;
        cameFrom[next] = state;
        heap.push(next, total + heuristic(ni, nj));
      }
    }
  }

  if (goalState === -1) return null;

  const cells: Point[] = [];
  for (let state = goalState; state !== -1; state = cameFrom[state]) {
    const cell = state >> 2;
    const i = cell % cols;
    cells.push({ x: xs[i], y: ys[(cell - i) / cols] });
  }
  cells.reverse();

  return simplify([source.point, ...cells, target.point]);
}
