import { estimateLatency, type LatencyEstimate } from "./latency-estimate";

// Short, fixed-precision text for a latency in milliseconds, built to fit in
// a narrow readout: 8.3ms, 69ms, 1.2s, 12s, 1.5m.
export function formatLatency(ms: number): string {
  if (!Number.isFinite(ms)) return "–";
  if (ms <= 0) return "0ms";
  if (ms < 1) return "<1ms";

  const tenth = Math.round(ms * 10) / 10;
  if (tenth < 10) return `${tenth.toFixed(1)}ms`;
  const whole = Math.round(ms);
  if (whole < 1000) return `${whole}ms`;

  const seconds = ms / 1000;
  const secondsTenth = Math.round(seconds * 10) / 10;
  if (secondsTenth < 10) return `${secondsTenth.toFixed(1)}s`;
  const secondsWhole = Math.round(seconds);
  if (secondsWhole < 60) return `${secondsWhole}s`;

  return `${Math.round((seconds / 60) * 10) / 10}m`;
}

// A node that adds no latency has nothing to estimate.
export function estimateNodeLatency(node: {
  latencyMs: number;
  latencyVariance: number;
}): LatencyEstimate | null {
  if (!Number.isFinite(node.latencyMs) || !(node.latencyMs > 0)) return null;
  const variance = Number.isFinite(node.latencyVariance)
    ? Math.max(0, node.latencyVariance)
    : 0;
  return estimateLatency({ mean: node.latencyMs, variance });
}

export function latencyTitle(estimate: LatencyEstimate): string {
  return `Estimated latency from this node down: p50 ${formatLatency(estimate.p50)}, p95 ${formatLatency(estimate.p95)}, p99 ${formatLatency(estimate.p99)}. Assumes exponential service times and independent nodes.`;
}
