import type {
  EdgeFrame,
  Frame,
  NodeFrame,
  SimEdge,
  SimGraph,
  SimNode,
  SimState,
} from "./types";

export const DT = 0.1;

const MIN_HEADROOM = 0.05;

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
  return { tick: 0, queues: {} };
}

export function step(
  graph: SimGraph,
  order: string[],
  state: SimState,
  loadFactor: number,
): StepResult {
  const factor = Math.max(0, loadFactor);
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

  const inflow = new Map<string, number>();
  const asyncInflow = new Map<string, number>();
  const edgeFlow = new Map<string, number>();
  const passes = new Map<string, Pass>();

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
            calls += portion * (success.get(edge.target) ?? 1);
            callMs += portion * (latency.get(edge.target) ?? 0);
          }
        }
      }
    } else {
      for (const edge of edges) {
        if (isAsync(edge)) continue;
        calls *= 1 - edge.share + edge.share * (success.get(edge.target) ?? 1);
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
  let generated = 0;
  let goodput = 0;
  let dropped = 0;
  let lost = 0;

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
    const flow = (edgeFlow.get(edge.id) ?? 0) / DT;
    const target = nodes.get(edge.target);
    const pass = passes.get(edge.target);
    const accepted =
      target && pass ? pass.admission * (1 - target.failRate) : 1;
    edgeFrames[edge.id] = {
      flow,
      failed: flow * (1 - (success.get(edge.target) ?? 1)),
      rejected: flow * (1 - accepted),
    };
  }

  const tick = state.tick + 1;

  return {
    state: { tick, queues },
    frame: {
      t: tick * DT,
      nodes: nodeFrames,
      edges: edgeFrames,
      totals: { generated, goodput, dropped, lost },
    },
  };
}
