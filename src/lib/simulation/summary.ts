import {
  estimateLatency,
  mixture,
  quantile,
  type Moments,
} from "./latency-estimate";
import type { EdgeFrame, Frame, SimGraph } from "./types";

const FAILING_SHARE = 0.02;
const REFUSAL_FLOOR = 0.5;
const SATURATED = 0.95;
const NEAR_LIMIT = 0.85;
const MIN_REFUSED_VOLUME = 1;
const MIN_RETRIED_VOLUME = 1;
const FULL_MARGIN = 1e-6;

export interface NodeSummary {
  id: string;
  isQueue: boolean;
  rateLimit: number;
  refused: number;
  refusedRetries: number;
  limited: number;
  unavailable: number;
  timedOut: number;
  firstRefusedAt: number | null;
  firstLimitedAt: number | null;
  firstDownAt: number | null;
  downSeconds: number;
  peakUtilization: number;
  saturatedSeconds: number;
  peakQueue: number;
  peakLagSeconds: number;
  fullAt: number | null;
}

export interface EdgeRetrySummary {
  id: string;
  source: string;
  target: string;
  retried: number;
  peakRate: number;
}

// Counted from one sample per simulated second, so a breaker that cycles
// faster than that is undercounted.
export interface BreakerSummary {
  id: string;
  source: string;
  target: string;
  trips: number;
  firstOpenedAt: number | null;
  openSeconds: number;
  halfOpenSeconds: number;
  shortCircuited: number;
}

// One step on the slowest path: the delay the node adds by itself, and how
// busy it was.
export interface LatencyHop {
  id: string;
  ownMs: number;
  utilization: number;
}

// All of this is an estimate. It assumes exponential service times and
// independent nodes, and covers every request as the model sees it,
// including those that fail fast. The run-wide figures mix the seconds of the
// run in proportion to the traffic each carried.
export interface LatencySummary {
  meanMs: number;
  p50: number;
  p95: number;
  p99: number;
  peak: { p99: number; at: number };
  path: LatencyHop[];
}

export interface RunSummary {
  seconds: number;
  generated: number;
  succeeded: number;
  dropped: number;
  lost: number;
  retried: number;
  timedOut: number;
  shortCircuited: number;
  throttled: number;
  unavailable: number;
  successRate: number;
  averageGoodput: number;
  minGoodput: number;
  firstFailureAt: number | null;
  latency: LatencySummary | null;
  nodes: NodeSummary[];
  retryEdges: EdgeRetrySummary[];
  breakers: BreakerSummary[];
  bottleneck: { id: string; kind: "refusing" | "near-limit" } | null;
}

interface PeakSecond {
  p99: number;
  at: number;
  frame: Frame;
}

// Follows the slowest synchronous callee from the slowest client, the same
// rule the engine uses for parallel calls. Async edges, edges leaving a
// queue and open breakers carry no latency, so they are skipped.
function criticalPath(frame: Frame, graph: SimGraph): LatencyHop[] {
  const roles = new Map(graph.nodes.map((node) => [node.id, node.role]));
  const outgoing = new Map<string, typeof graph.edges>();
  for (const edge of graph.edges) {
    const list = outgoing.get(edge.source);
    if (list) list.push(edge);
    else outgoing.set(edge.source, [edge]);
  }

  let start: string | null = null;
  let startMean = -1;
  for (const node of graph.nodes) {
    if (node.role !== "source") continue;
    const mean = frame.nodes[node.id]?.latencyMs ?? 0;
    if (mean > startMean) {
      start = node.id;
      startMean = mean;
    }
  }
  if (start === null) return [];

  const hops: LatencyHop[] = [];
  const seen = new Set<string>([start]);
  let current = start;

  for (;;) {
    let next: { id: string; mean: number } | null = null;
    for (const edge of outgoing.get(current) ?? []) {
      if (edge.mode === "async" || roles.get(current) === "queue") continue;
      if (edge.share <= 0 || seen.has(edge.target)) continue;
      if (frame.edges[edge.id]?.breaker === "open") continue;
      const target = frame.nodes[edge.target];
      if (!target) continue;
      if (!next || target.latencyMs > next.mean) {
        next = { id: edge.target, mean: target.latencyMs };
      }
    }
    if (!next || !(next.mean > 0)) break;

    seen.add(next.id);
    const node = frame.nodes[next.id];
    hops.push({
      id: next.id,
      ownMs: node.ownLatencyMs,
      utilization: node.utilization,
    });
    current = next.id;
  }
  return hops;
}

function summarizeLatency(
  parts: { weight: number; moments: Moments }[],
  peak: PeakSecond | null,
  graph: SimGraph,
): LatencySummary | null {
  if (!peak) return null;

  const moments = mixture(parts);
  if (!(moments.mean > 0)) return null;

  return {
    meanMs: moments.mean,
    ...estimateLatency(moments),
    peak: { p99: peak.p99, at: peak.at },
    path: criticalPath(peak.frame, graph),
  };
}

// History holds one frame per simulated second, so each frame's per-second
// rates stand for the whole second and volumes are sums of those rates.
export function summarizeRun(
  history: Frame[],
  graph: SimGraph,
): RunSummary | null {
  if (history.length === 0) return null;

  const nodes = new Map<string, NodeSummary>();
  const buffers = new Map<string, number>();
  for (const node of graph.nodes) {
    nodes.set(node.id, {
      id: node.id,
      isQueue: node.role === "queue",
      rateLimit: node.role === "source" ? 0 : node.rateLimit,
      refused: 0,
      refusedRetries: 0,
      limited: 0,
      unavailable: 0,
      timedOut: 0,
      firstRefusedAt: null,
      firstLimitedAt: null,
      firstDownAt: null,
      downSeconds: 0,
      peakUtilization: 0,
      saturatedSeconds: 0,
      peakQueue: 0,
      peakLagSeconds: 0,
      fullAt: null,
    });
    buffers.set(node.id, node.buffer);
  }
  const edges = new Map<string, EdgeRetrySummary>(
    graph.edges.map((edge) => [
      edge.id,
      {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        retried: 0,
        peakRate: 0,
      },
    ]),
  );
  const breakers = new Map<string, BreakerSummary>(
    graph.edges.map((edge) => [
      edge.id,
      {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        trips: 0,
        firstOpenedAt: null,
        openSeconds: 0,
        halfOpenSeconds: 0,
        shortCircuited: 0,
      },
    ]),
  );
  const lastMode = new Map<string, EdgeFrame["breaker"]>();
  const sources = graph.nodes
    .filter((node) => node.role === "source")
    .map((node) => node.id);
  const latencyParts: { weight: number; moments: Moments }[] = [];
  let peak: PeakSecond | null = null;

  let generated = 0;
  let succeeded = 0;
  let dropped = 0;
  let lost = 0;
  let retried = 0;
  let timedOut = 0;
  let shortCircuited = 0;
  let throttled = 0;
  let unavailable = 0;
  let minGoodput = Infinity;
  let firstFailureAt: number | null = null;

  for (const frame of history) {
    const at = Math.round(frame.t);
    const { totals } = frame;

    generated += totals.generated;
    succeeded += totals.goodput;
    dropped += totals.dropped;
    lost += totals.lost;
    retried += totals.retries;
    timedOut += totals.timedOut;
    shortCircuited += totals.shortCircuited;
    throttled += totals.throttled;
    minGoodput = Math.min(minGoodput, totals.goodput);
    if (
      firstFailureAt === null &&
      totals.generated > 0 &&
      totals.goodput < totals.generated * (1 - FAILING_SHARE)
    ) {
      firstFailureAt = at;
    }

    // End-to-end latency is what the clients see, mixed by how much each
    // one sent this second.
    const parts = sources
      .map((id) => ({
        weight: frame.nodes[id]?.offered ?? 0,
        moments: {
          mean: frame.nodes[id]?.latencyMs ?? 0,
          variance: frame.nodes[id]?.latencyVariance ?? 0,
        },
      }))
      .filter((part) => part.weight > 0);
    const weight = parts.reduce((sum, part) => sum + part.weight, 0);
    if (weight > 0) {
      const moments = mixture(parts);
      latencyParts.push({ weight, moments });
      if (moments.mean > 0) {
        const p99 = quantile(moments, 0.99);
        if (!peak || p99 > peak.p99) peak = { p99, at, frame };
      }
    }

    for (const [id, nodeFrame] of Object.entries(frame.nodes)) {
      const node = nodes.get(id);
      if (!node) continue;
      node.timedOut += nodeFrame.timedOut;
      node.limited += nodeFrame.limited;
      node.unavailable += nodeFrame.unavailable;
      unavailable += nodeFrame.unavailable;
      if (nodeFrame.down) {
        node.downSeconds += 1;
        if (node.firstDownAt === null) node.firstDownAt = at;
      }
      if (node.firstLimitedAt === null && nodeFrame.limited >= REFUSAL_FLOOR) {
        node.firstLimitedAt = at;
      }
      node.peakUtilization = Math.max(
        node.peakUtilization,
        nodeFrame.utilization,
      );
      if (nodeFrame.utilization >= SATURATED) node.saturatedSeconds += 1;
      node.peakQueue = Math.max(node.peakQueue, nodeFrame.queue);
      node.peakLagSeconds = Math.max(node.peakLagSeconds, nodeFrame.lagSeconds);
      const buffer = buffers.get(id) ?? 0;
      if (
        node.fullAt === null &&
        buffer > 0 &&
        nodeFrame.queue >= buffer - FULL_MARGIN
      ) {
        node.fullAt = at;
      }
    }

    for (const [id, edgeFrame] of Object.entries(frame.edges)) {
      const edge = edges.get(id);
      if (!edge) continue;

      edge.retried += edgeFrame.retry;
      edge.peakRate = Math.max(edge.peakRate, edgeFrame.retry);

      const breaker = breakers.get(id);
      if (breaker) {
        breaker.shortCircuited += edgeFrame.blocked;
        if (edgeFrame.breaker === "open") {
          breaker.openSeconds += 1;
          if (lastMode.get(id) !== "open") {
            breaker.trips += 1;
            if (breaker.firstOpenedAt === null) breaker.firstOpenedAt = at;
          }
        } else if (edgeFrame.breaker === "half-open") {
          breaker.halfOpenSeconds += 1;
        }
        lastMode.set(id, edgeFrame.breaker);
      }

      const node = nodes.get(edge.target);
      if (!node) continue;
      node.refused += edgeFrame.rejected;
      // A refusal hits original attempts and retries in proportion.
      const retryShare =
        edgeFrame.flow > 0 ? Math.min(1, edgeFrame.retry / edgeFrame.flow) : 0;
      node.refusedRetries += edgeFrame.rejected * retryShare;
      if (node.firstRefusedAt === null && edgeFrame.rejected >= REFUSAL_FLOOR) {
        node.firstRefusedAt = at;
      }
    }
  }

  const ranked = [...nodes.values()].sort(
    (a, b) =>
      b.refused - a.refused ||
      b.peakUtilization - a.peakUtilization ||
      a.id.localeCompare(b.id),
  );

  const retryEdges = [...edges.values()]
    .filter((edge) => edge.retried >= MIN_RETRIED_VOLUME)
    .sort((a, b) => b.retried - a.retried || a.id.localeCompare(b.id));

  const trippedBreakers = [...breakers.values()]
    .filter((breaker) => breaker.trips > 0)
    .sort(
      (a, b) => b.shortCircuited - a.shortCircuited || a.id.localeCompare(b.id),
    );

  let bottleneck: RunSummary["bottleneck"] = null;
  if (ranked[0] && ranked[0].refused >= MIN_REFUSED_VOLUME) {
    bottleneck = { id: ranked[0].id, kind: "refusing" };
  } else {
    let nearest: NodeSummary | null = null;
    for (const node of ranked) {
      if (
        node.peakUtilization >= NEAR_LIMIT &&
        (!nearest || node.peakUtilization > nearest.peakUtilization)
      ) {
        nearest = node;
      }
    }
    if (nearest) bottleneck = { id: nearest.id, kind: "near-limit" };
  }

  return {
    seconds: Math.round(history[history.length - 1].t),
    generated,
    succeeded,
    dropped,
    lost,
    retried,
    timedOut,
    shortCircuited,
    throttled,
    unavailable,
    successRate: generated > 0 ? succeeded / generated : 1,
    averageGoodput: succeeded / history.length,
    minGoodput,
    firstFailureAt,
    latency: summarizeLatency(latencyParts, peak, graph),
    nodes: ranked,
    retryEdges,
    breakers: trippedBreakers,
    bottleneck,
  };
}
