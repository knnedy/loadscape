import type { Frame, SimGraph } from "./types";

const FAILING_SHARE = 0.02;
const REFUSAL_FLOOR = 0.5;
const SATURATED = 0.95;
const NEAR_LIMIT = 0.85;
const MIN_REFUSED_VOLUME = 1;
const FULL_MARGIN = 1e-6;

export interface NodeSummary {
  id: string;
  isQueue: boolean;
  refused: number;
  firstRefusedAt: number | null;
  peakUtilization: number;
  saturatedSeconds: number;
  peakQueue: number;
  peakLagSeconds: number;
  fullAt: number | null;
}

export interface RunSummary {
  seconds: number;
  generated: number;
  succeeded: number;
  dropped: number;
  lost: number;
  successRate: number;
  averageGoodput: number;
  minGoodput: number;
  firstFailureAt: number | null;
  nodes: NodeSummary[];
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
      firstRefusedAt: null,
      peakUtilization: 0,
      saturatedSeconds: 0,
      peakQueue: 0,
      peakLagSeconds: 0,
      fullAt: null,
    });
    buffers.set(node.id, node.buffer);
  }
  const targetOf = new Map(graph.edges.map((edge) => [edge.id, edge.target]));

  let generated = 0;
  let succeeded = 0;
  let dropped = 0;
  let lost = 0;
  let minGoodput = Infinity;
  let firstFailureAt: number | null = null;

  for (const frame of history) {
    const at = Math.round(frame.t);
    const { totals } = frame;

    generated += totals.generated;
    succeeded += totals.goodput;
    dropped += totals.dropped;
    lost += totals.lost;
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
      const target = targetOf.get(id);
      const node = target ? nodes.get(target) : undefined;
      if (!node) continue;
      node.refused += edgeFrame.rejected;
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
    successRate: generated > 0 ? succeeded / generated : 1,
    averageGoodput: succeeded / history.length,
    minGoodput,
    firstFailureAt,
    nodes: ranked,
    bottleneck,
  };
}
