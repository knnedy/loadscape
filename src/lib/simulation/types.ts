export type EdgeMode = "sync" | "async";

export type Fanout = "all" | "split";

export type NodeRole = "source" | "service" | "queue";

export type BreakerMode = "closed" | "open" | "half-open";

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
  rateLimit: number;
  rateBurst: number;
}

export interface SimEdge {
  id: string;
  source: string;
  target: string;
  mode: EdgeMode;
  share: number;
  retries: number;
  backoffMs: number;
  breakerThreshold: number;
  breakerCooldownMs: number;
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

// One circuit breaker. `failure` is the smoothed failure share while closed,
// `until` is the first tick an open breaker may probe, and the probe fields
// accumulate over a half-open window.
export interface BreakerState {
  mode: BreakerMode;
  failure: number;
  until: number;
  probeTicks: number;
  probeAttempts: number;
  probeFailed: number;
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
  breakers: Record<string, BreakerState>;
  // Tokens left in each rate limiter's bucket, in requests.
  tokens: Record<string, number>;
}

// `limited` is the rate of requests this node's rate limiter turned away. It
// is part of `dropped`. `timedOut` is the rate of requests that gave up
// waiting in this node's line; they were admitted earlier, so they are not
// part of `dropped`.
export interface NodeFrame {
  offered: number;
  admitted: number;
  served: number;
  dropped: number;
  limited: number;
  timedOut: number;
  queue: number;
  utilization: number;
  latencyMs: number;
  lagSeconds: number;
}

// `flow` counts every attempt that reached the target, original and retry.
// `retry` is the retry part of it. `blocked` is the rate of attempts a circuit
// breaker stopped before they reached the target. `failed` counts every
// attempt that reached the target and ended in failure anywhere downstream.
// `rejected` is the part refused by the target itself, through drops, rate
// limits, timeouts or its own failure rate, so it marks where a failure
// starts.
export interface EdgeFrame {
  flow: number;
  retry: number;
  blocked: number;
  breaker: "off" | BreakerMode;
  failed: number;
  rejected: number;
}

// `dropped` includes rate-limited requests and timeouts at services, since
// those fail their callers. `timedOut` is every timeout, including the silent
// ones at queues, which are also counted in `lost`. `throttled` is the total
// rate the rate limiters turned away, already counted in `dropped` or `lost`.
// `shortCircuited` is the total rate of attempts that circuit breakers failed
// fast.
export interface FrameTotals {
  generated: number;
  goodput: number;
  dropped: number;
  lost: number;
  retries: number;
  timedOut: number;
  shortCircuited: number;
  throttled: number;
}

export interface Frame {
  t: number;
  nodes: Record<string, NodeFrame>;
  edges: Record<string, EdgeFrame>;
  totals: FrameTotals;
}
