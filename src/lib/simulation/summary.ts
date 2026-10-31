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
  refused: number;
  refusedRetries: number;
  timedOut: number;
  firstRefusedAt: number | null;
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

export interface RunSummary {
  seconds: number;
  generated: number;
  succeeded: number;
  dropped: number;
  lost: number;
  retried: number;
  timedOut: number;
  shortCircuited: number;
  successRate: number;
  averageGoodput: number;
  minGoodput: number;
  firstFailureAt: number | null;
  nodes: NodeSummary[];
  retryEdges: EdgeRetrySummary[];
  breakers: BreakerSummary[];
  bottleneck: { id: string; kind: "refusing" | "near-limit" } | null;
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
      refused: 0,
      refusedRetries: 0,
      timedOut: 0,
      firstRefusedAt: null,
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

  let generated = 0;
  let succeeded = 0;
  let dropped = 0;
  let lost = 0;
  let retried = 0;
  let timedOut = 0;
  let shortCircuited = 0;
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
    minGoodput = Math.min(minGoodput, totals.goodput);
    if (
      firstFailureAt === null &&
      totals.generated > 0 &&
      totals.goodput < totals.generated * (1 - FAILING_SHARE)
    ) {
      firstFailureAt = at;
    }

    for (const [id, nodeFrame] of Object.entries(frame.nodes)) {
      const node = nodes.get(id);
      if (!node) continue;
      node.timedOut += nodeFrame.timedOut;
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
    successRate: generated > 0 ? succeeded / generated : 1,
    averageGoodput: succeeded / history.length,
    minGoodput,
    firstFailureAt,
    nodes: ranked,
    retryEdges,
    breakers: trippedBreakers,
    bottleneck,
  };
}
