import type {
  EdgeFrame,
  Frame,
  NodeFrame,
  RetryEntry,
  SimEdge,
  SimGraph,
  SimNode,
  SimState,
  WaitingCohort,
} from "./types";

export const DT = 0.1;

const MIN_HEADROOM = 0.05;
const MIN_RETRY_VOLUME = 1e-9;
const MIN_COHORT_VOLUME = 1e-12;

export interface StepResult {
  state: SimState;
  frame: Frame;
}

interface Pass {
  generated: number;
  arrivals: number;
  admitted: number;
  served: number;
  dropped: number;
  timedOut: number;
  timeoutShare: number;
  queue: number;
  capacity: number;
  admission: number;
  utilization: number;
  maxWait: number;
}

interface Settled {
  served: number;
  overflow: number;
  evicted: number;
  expired: number;
  queue: number;
  cohorts: WaitingCohort[] | null;
}

export function createState(): SimState {
  return { tick: 0, queues: {}, retries: {}, waiting: {} };
}

// Each retry waits twice as long as the one before it, and never less than
// one tick.
export function retryDelayTicks(backoffMs: number, attempt: number): number {
  return Math.max(
    1,
    Math.round((backoffMs * 2 ** (attempt - 1)) / (DT * 1000)),
  );
}

// How many ticks a request may wait before it gives up. 0 means never.
export function timeoutTicks(timeoutMs: number): number {
  return timeoutMs > 0 ? Math.max(1, Math.round(timeoutMs / (DT * 1000))) : 0;
}

function schedule(
  list: RetryEntry[],
  due: number,
  attempt: number,
  volume: number,
) {
  if (!(volume > MIN_RETRY_VOLUME)) return;
  const existing = list.find(
    (entry) => entry.due === due && entry.attempt === attempt,
  );
  if (existing) existing.volume += volume;
  else list.push({ due, attempt, volume });
}

function volumeOf(cohorts: WaitingCohort[]): number {
  let total = 0;
  for (const cohort of cohorts) total += cohort.volume;
  return total;
}

function trimTail(cohorts: WaitingCohort[], amount: number) {
  let cut = amount;
  while (cut > MIN_COHORT_VOLUME && cohorts.length > 0) {
    const last = cohorts[cohorts.length - 1];
    const take = Math.min(last.volume, cut);
    last.volume -= take;
    cut -= take;
    if (last.volume <= MIN_COHORT_VOLUME) cohorts.pop();
  }
}

// A node with no timeout only needs the total waiting.
function settleScalar(
  node: SimNode,
  state: SimState,
  arrivals: number,
  budget: number,
): Settled {
  const held = state.queues[node.id] ?? 0;
  const kept = Math.min(held, node.buffer);
  const demand = kept + arrivals;
  const served = Math.min(demand, budget);
  return {
    served,
    overflow: Math.min(arrivals, Math.max(0, demand - served - node.buffer)),
    evicted: held - kept,
    expired: 0,
    queue: Math.min(demand - served, node.buffer),
    cohorts: null,
  };
}

// A node with a timeout keeps its line as batches by arrival tick, oldest
// first. Batches that have waited the full timeout give up before service.
function settleCohorts(
  node: SimNode,
  state: SimState,
  nextTick: number,
  arrivals: number,
  budget: number,
  limit: number,
): Settled {
  const stored = state.waiting[node.id];
  const seed = state.queues[node.id] ?? 0;
  let cohorts: WaitingCohort[] = stored
    ? stored.map((cohort) => ({ ...cohort }))
    : seed > MIN_COHORT_VOLUME
      ? [{ tick: state.tick, volume: seed }]
      : [];

  let first = 0;
  let expired = 0;
  while (
    first < cohorts.length &&
    nextTick - 1 - cohorts[first].tick >= limit
  ) {
    expired += cohorts[first].volume;
    first++;
  }
  cohorts = cohorts.slice(first);

  const held = volumeOf(cohorts);
  const kept = Math.min(held, node.buffer);
  trimTail(cohorts, held - kept);

  if (arrivals > 0) cohorts.push({ tick: nextTick, volume: arrivals });
  const demand = kept + arrivals;
  const served = Math.min(demand, budget);

  let remaining = served;
  let head = 0;
  while (remaining > 0 && head < cohorts.length) {
    const cohort = cohorts[head];
    const take = Math.min(cohort.volume, remaining);
    cohort.volume -= take;
    remaining -= take;
    if (cohort.volume <= MIN_COHORT_VOLUME) head++;
    else break;
  }
  cohorts = cohorts.slice(head);

  const overflow = Math.min(
    arrivals,
    Math.max(0, demand - served - node.buffer),
  );
  trimTail(cohorts, overflow);

  return {
    served,
    overflow,
    evicted: held - kept,
    expired,
    queue: Math.min(demand - served, node.buffer),
    cohorts,
  };
}

export function step(
  graph: SimGraph,
  order: string[],
  state: SimState,
  loadFactor: number,
): StepResult {
  const factor = Math.max(0, loadFactor);
  const nextTick = state.tick + 1;
  const nodes = new Map<string, SimNode>();
  const outgoing = new Map<string, SimEdge[]>();

  for (const node of graph.nodes) {
    nodes.set(node.id, node);
    outgoing.set(node.id, []);
  }
  for (const edge of graph.edges) {
    outgoing.get(edge.source)?.push(edge);
  }

  const isAsync = (edge: SimEdge) =>
    edge.mode === "async" || nodes.get(edge.source)?.role === "queue";
  const retried = (edge: SimEdge) => edge.retries > 0 && !isAsync(edge);

  const inflow = new Map<string, number>();
  const asyncInflow = new Map<string, number>();
  const edgeFlow = new Map<string, number>();
  const retryFlow = new Map<string, number>();
  const released = new Map<string, RetryEntry[]>();
  const waiting = new Map<string, RetryEntry[]>();
  const waitingNext: Record<string, WaitingCohort[]> = {};
  const passes = new Map<string, Pass>();

  // Retries due this tick come out of per-edge state, so they are known
  // before any node is processed. That keeps the pass acyclic.
  for (const edge of graph.edges) {
    if (!retried(edge)) continue;
    const due: RetryEntry[] = [];
    const rest: RetryEntry[] = [];
    for (const entry of state.retries[edge.id] ?? []) {
      if (entry.due <= nextTick) due.push(entry);
      else rest.push({ ...entry });
    }
    const volume = due.reduce((sum, entry) => sum + entry.volume, 0);
    released.set(edge.id, due);
    waiting.set(edge.id, rest);
    retryFlow.set(edge.id, volume);
    inflow.set(edge.target, (inflow.get(edge.target) ?? 0) + volume);
  }

  for (const id of order) {
    const node = nodes.get(id);
    if (!node) continue;

    const generated = node.role === "source" ? node.rps * factor * DT : 0;
    const arrivals = generated + (inflow.get(id) ?? 0);
    const capacity = node.capacity * node.instances;
    const limit = node.buffer > 0 ? timeoutTicks(node.timeoutMs) : 0;
    const settled =
      limit > 0
        ? settleCohorts(node, state, nextTick, arrivals, capacity * DT, limit)
        : settleScalar(node, state, arrivals, capacity * DT);

    if (settled.cohorts && settled.cohorts.length > 0) {
      waitingNext[id] = settled.cohorts;
    }

    // A queue's callers only need the hand-off, so its timeouts are silent.
    const timeoutShare =
      node.role === "queue" || arrivals <= 0
        ? 0
        : Math.min(1, settled.expired / arrivals);

    passes.set(id, {
      generated,
      arrivals,
      admitted: arrivals - settled.overflow,
      served: settled.served,
      dropped: settled.overflow + settled.evicted,
      timedOut: settled.expired,
      timeoutShare,
      queue: settled.queue,
      capacity,
      admission: arrivals > 0 ? (arrivals - settled.overflow) / arrivals : 1,
      utilization: arrivals / DT / capacity,
      maxWait: limit > 0 ? limit * DT : Infinity,
    });

    const edges = outgoing.get(id) ?? [];
    const weight = edges.reduce((sum, edge) => sum + edge.share, 0);
    const emitted = settled.served * (1 - node.hitRatio);

    for (const edge of edges) {
      const portion =
        node.fanout === "split"
          ? weight > 0
            ? edge.share / weight
            : 0
          : edge.share;
      const flow = emitted * portion;
      edgeFlow.set(edge.id, flow);
      inflow.set(edge.target, (inflow.get(edge.target) ?? 0) + flow);
      if (isAsync(edge)) {
        asyncInflow.set(
          edge.target,
          (asyncInflow.get(edge.target) ?? 0) + flow,
        );
      }
    }
  }

  const success = new Map<string, number>();
  const latency = new Map<string, number>();

  // A call that may be retried succeeds if any of its attempts does.
  const attemptSuccess = (edge: SimEdge) => {
    const single = success.get(edge.target) ?? 1;
    return edge.retries > 0 ? 1 - (1 - single) ** (1 + edge.retries) : single;
  };

  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const node = nodes.get(id);
    const pass = passes.get(id);
    if (!node || !pass) continue;

    const edges = outgoing.get(id) ?? [];
    let calls = 1;
    let callMs = 0;

    if (node.fanout === "split") {
      const weight = edges.reduce((sum, edge) => sum + edge.share, 0);
      if (weight > 0) {
        calls = 0;
        for (const edge of edges) {
          const portion = edge.share / weight;
          if (isAsync(edge)) {
            calls += portion;
          } else {
            calls += portion * attemptSuccess(edge);
            callMs += portion * (latency.get(edge.target) ?? 0);
          }
        }
      }
    } else {
      for (const edge of edges) {
        if (isAsync(edge)) continue;
        calls *= 1 - edge.share + edge.share * attemptSuccess(edge);
        if (edge.share > 0) {
          callMs = Math.max(callMs, latency.get(edge.target) ?? 0);
        }
      }
    }

    success.set(
      id,
      pass.admission *
        (1 - node.failRate) *
        (1 - pass.timeoutShare) *
        (node.hitRatio + (1 - node.hitRatio) * calls),
    );

    const service =
      node.latencyMs / Math.max(1 - pass.utilization, MIN_HEADROOM);
    const waitMs = Math.min(pass.queue / pass.capacity, pass.maxWait) * 1000;
    const own = node.role === "queue" ? 0 : service + waitMs;
    latency.set(id, own + (1 - node.hitRatio) * callMs);
  }

  const nodeFrames: Record<string, NodeFrame> = {};
  const edgeFrames: Record<string, EdgeFrame> = {};
  const queues: Record<string, number> = {};
  const retries: Record<string, RetryEntry[]> = {};
  let generated = 0;
  let goodput = 0;
  let dropped = 0;
  let lost = 0;
  let retrying = 0;
  let timedOut = 0;

  for (const id of order) {
    const node = nodes.get(id);
    const pass = passes.get(id);
    if (!node || !pass) continue;

    queues[id] = pass.queue;
    nodeFrames[id] = {
      offered: pass.arrivals / DT,
      admitted: pass.admitted / DT,
      served: pass.served / DT,
      dropped: pass.dropped / DT,
      timedOut: pass.timedOut / DT,
      queue: pass.queue,
      utilization: Math.min(1, pass.utilization),
      latencyMs: latency.get(id) ?? 0,
      lagSeconds:
        node.role === "queue"
          ? Math.min(pass.queue / pass.capacity, pass.maxWait)
          : 0,
    };

    generated += pass.generated / DT;
    goodput += (pass.generated / DT) * (success.get(id) ?? 1);

    const viaAsync =
      pass.arrivals > 0
        ? Math.min(1, (asyncInflow.get(id) ?? 0) / pass.arrivals)
        : 0;
    lost += (pass.dropped / DT) * viaAsync;
    dropped += (pass.dropped / DT) * (1 - viaAsync);

    const expired = pass.timedOut / DT;
    timedOut += expired;
    if (node.role === "queue") {
      lost += expired;
    } else {
      lost += expired * viaAsync;
      dropped += expired * (1 - viaAsync);
    }
  }

  for (const edge of graph.edges) {
    const original = edgeFlow.get(edge.id) ?? 0;
    const retry = retryFlow.get(edge.id) ?? 0;
    const flow = (original + retry) / DT;
    const target = nodes.get(edge.target);
    const pass = passes.get(edge.target);
    const accepted =
      target && pass
        ? pass.admission * (1 - target.failRate) * (1 - pass.timeoutShare)
        : 1;
    const failShare = 1 - (success.get(edge.target) ?? 1);

    edgeFrames[edge.id] = {
      flow,
      retry: retry / DT,
      failed: flow * failShare,
      rejected: flow * (1 - accepted),
    };
    retrying += retry / DT;

    // Attempts that failed this tick come back after their backoff, until
    // the edge's retries are used up.
    const pending = waiting.get(edge.id);
    if (!pending) continue;
    schedule(
      pending,
      nextTick + retryDelayTicks(edge.backoffMs, 1),
      1,
      original * failShare,
    );
    for (const entry of released.get(edge.id) ?? []) {
      if (entry.attempt >= edge.retries) continue;
      const attempt = entry.attempt + 1;
      schedule(
        pending,
        nextTick + retryDelayTicks(edge.backoffMs, attempt),
        attempt,
        entry.volume * failShare,
      );
    }
    if (pending.length > 0) retries[edge.id] = pending;
  }

  return {
    state: { tick: nextTick, queues, retries, waiting: waitingNext },
    frame: {
      t: nextTick * DT,
      nodes: nodeFrames,
      edges: edgeFrames,
      totals: {
        generated,
        goodput,
        dropped,
        lost,
        retries: retrying,
        timedOut,
      },
    },
  };
}
