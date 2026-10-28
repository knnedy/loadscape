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
  retries: number;
  backoffMs: number;
}

// Failed attempts waiting to re-enter their edge's target. `attempt` is the
// retry number, from 1, and `volume` is requests, not a rate.
export interface RetryEntry {
  due: number;
  attempt: number;
  volume: number;
}

export interface SimGraph {
  nodes: SimNode[];
  edges: SimEdge[];
}

export interface SimState {
  tick: number;
  queues: Record<string, number>;
  retries: Record<string, RetryEntry[]>;
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

// `flow` counts every attempt on the edge, original and retry. `retry` is the
// retry part of it. `failed` counts every attempt that ends in failure
// anywhere downstream. `rejected` is the part refused by the target itself,
// through drops or its own failure rate, so it marks where a failure starts.
export interface EdgeFrame {
  flow: number;
  retry: number;
  failed: number;
  rejected: number;
}

export interface FrameTotals {
  generated: number;
  goodput: number;
  dropped: number;
  lost: number;
  retries: number;
}

export interface Frame {
  t: number;
  nodes: Record<string, NodeFrame>;
  edges: Record<string, EdgeFrame>;
  totals: FrameTotals;
}
