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
  timeoutMs: number;
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

// Requests that arrived in the same tick and are still waiting in a node's
// line. Only kept for nodes with a timeout, oldest first.
export interface WaitingCohort {
  tick: number;
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
  waiting: Record<string, WaitingCohort[]>;
}

// `timedOut` is the rate of requests that gave up waiting in this node's
// line. They were admitted earlier, so they are not part of `dropped`.
export interface NodeFrame {
  offered: number;
  admitted: number;
  served: number;
  dropped: number;
  timedOut: number;
  queue: number;
  utilization: number;
  latencyMs: number;
  lagSeconds: number;
}

// `flow` counts every attempt on the edge, original and retry. `retry` is the
// retry part of it. `failed` counts every attempt that ends in failure
// anywhere downstream. `rejected` is the part refused by the target itself,
// through drops, timeouts or its own failure rate, so it marks where a
// failure starts.
export interface EdgeFrame {
  flow: number;
  retry: number;
  failed: number;
  rejected: number;
}

// `dropped` includes timeouts at services, since those fail their callers.
// `timedOut` is every timeout, including the silent ones at queues, which are
// also counted in `lost`.
export interface FrameTotals {
  generated: number;
  goodput: number;
  dropped: number;
  lost: number;
  retries: number;
  timedOut: number;
}

export interface Frame {
  t: number;
  nodes: Record<string, NodeFrame>;
  edges: Record<string, EdgeFrame>;
  totals: FrameTotals;
}
