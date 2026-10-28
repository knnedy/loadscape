export type EdgeMode = "sync" | "async";

export type Fanout = "all" | "split";

export type NodeRole = "source" | "service" | "queue";

export interface SimNode {
  id: string;
  role: NodeRole;
  capacity: number;
  instances: number;
  buffer: number;
  hitRatio: number;
  fanout: Fanout;
  latencyMs: number;
  failRate: number;
  rps: number;
}

export interface SimEdge {
  id: string;
  source: string;
  target: string;
  mode: EdgeMode;
  share: number;
}

export interface SimGraph {
  nodes: SimNode[];
  edges: SimEdge[];
}

export interface SimState {
  tick: number;
  queues: Record<string, number>;
}

export interface NodeFrame {
  offered: number;
  admitted: number;
  served: number;
  dropped: number;
  queue: number;
  utilization: number;
  latencyMs: number;
  lagSeconds: number;
}

// `failed` counts every request on the edge that ends in failure anywhere
// downstream. `rejected` is the part refused by the target itself, through
// drops or its own failure rate, so it marks where a failure starts.
export interface EdgeFrame {
  flow: number;
  failed: number;
  rejected: number;
}

export interface FrameTotals {
  generated: number;
  goodput: number;
  dropped: number;
  lost: number;
}

export interface Frame {
  t: number;
  nodes: Record<string, NodeFrame>;
  edges: Record<string, EdgeFrame>;
  totals: FrameTotals;
}
