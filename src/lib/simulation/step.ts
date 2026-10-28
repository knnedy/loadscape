import type {
  EdgeFrame,
  Frame,
  NodeFrame,
  RetryEntry,
  SimEdge,
  SimGraph,
  SimNode,
  SimState,
} from "./types";

export const DT = 0.1;

const MIN_HEADROOM = 0.05;
const MIN_RETRY_VOLUME = 1e-9;

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
  queue: number;
  capacity: number;
  admission: number;
  utilization: number;
}

export function createState(): SimState {
  return { tick: 0, queues: {}, retries: {} };
}

// Each retry waits twice as long as the one before it, and never less than
// one tick.
export function retryDelayTicks(backoffMs: number, attempt: number): number {
  return Math.max(
    1,
    Math.round((backoffMs * 2 ** (attempt - 1)) / (DT * 1000)),
  );
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
    const held = state.queues[id] ?? 0;
    const kept = Math.min(held, node.buffer);
    const evicted = held - kept;
    const demand = kept + arrivals;
    const served = Math.min(demand, capacity * DT);
    const overflow = Math.min(
      arrivals,
      Math.max(0, demand - served - node.buffer),
    );
    const queue = Math.min(demand - served, node.buffer);

    passes.set(id, {
      generated,
      arrivals,
      admitted: arrivals - overflow,
      served,
      dropped: overflow + evicted,
      queue,
      capacity,
      admission: arrivals > 0 ? (arrivals - overflow) / arrivals : 1,
      utilization: arrivals / DT / capacity,
    });

    const edges = outgoing.get(id) ?? [];
    const weight = edges.reduce((sum, edge) => sum + edge.share, 0);
    const emitted = served * (1 - node.hitRatio);

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
        (node.hitRatio + (1 - node.hitRatio) * calls),
    );

    const service =
      node.latencyMs / Math.max(1 - pass.utilization, MIN_HEADROOM);
    const waitMs = (pass.queue / pass.capacity) * 1000;
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
      queue: pass.queue,
      utilization: Math.min(1, pass.utilization),
      latencyMs: latency.get(id) ?? 0,
      lagSeconds: node.role === "queue" ? pass.queue / pass.capacity : 0,
    };

    generated += pass.generated / DT;
    goodput += (pass.generated / DT) * (success.get(id) ?? 1);

    const viaAsync =
      pass.arrivals > 0
        ? Math.min(1, (asyncInflow.get(id) ?? 0) / pass.arrivals)
        : 0;
    lost += (pass.dropped / DT) * viaAsync;
    dropped += (pass.dropped / DT) * (1 - viaAsync);
  }

  for (const edge of graph.edges) {
    const original = edgeFlow.get(edge.id) ?? 0;
    const retry = retryFlow.get(edge.id) ?? 0;
    const flow = (original + retry) / DT;
    const target = nodes.get(edge.target);
    const pass = passes.get(edge.target);
    const accepted =
      target && pass ? pass.admission * (1 - target.failRate) : 1;
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
    state: { tick: nextTick, queues, retries },
    frame: {
      t: nextTick * DT,
      nodes: nodeFrames,
      edges: edgeFrames,
      totals: { generated, goodput, dropped, lost, retries: retrying },
    },
  };
}
