import type { EdgeMode, Fanout, SimEdge, SimGraph, SimNode } from "./types";

export type PresetKey =
  | "client"
  | "cache"
  | "loadBalancer"
  | "gateway"
  | "compute"
  | "database"
  | "queue"
  | "external";

type Behaviour = Omit<SimNode, "id">;

export type NodeOverrides = Partial<Omit<SimNode, "id" | "role">>;

export interface NodeInput {
  id: string;
  preset: PresetKey;
  overrides?: NodeOverrides;
}

export interface EdgeInput {
  id: string;
  source: string;
  target: string;
  mode: EdgeMode;
  share?: number;
  retries?: number;
  backoffMs?: number;
}

export interface GraphInput {
  nodes: NodeInput[];
  edges: EdgeInput[];
}

const MAX_RATE = 1_000_000_000;
const MAX_LATENCY_MS = 600_000;
const MAX_INSTANCES = 10_000;

const RANGES = {
  capacity: { min: 1, max: MAX_RATE },
  instances: { min: 1, max: MAX_INSTANCES },
  buffer: { min: 0, max: MAX_RATE },
  hitRatio: { min: 0, max: 1 },
  latencyMs: { min: 0, max: MAX_LATENCY_MS },
  failRate: { min: 0, max: 1 },
  rps: { min: 0, max: MAX_RATE },
  timeoutMs: { min: 0, max: 60_000 },
  share: { min: 0, max: 1 },
  retries: { min: 0, max: 5 },
  backoffMs: { min: 0, max: 5000 },
} as const;

const NUMERIC_KEYS = [
  "capacity",
  "instances",
  "buffer",
  "hitRatio",
  "latencyMs",
  "failRate",
  "rps",
  "timeoutMs",
] as const;

export const EDGE_DEFAULTS = { share: 1, retries: 0, backoffMs: 100 } as const;

export const PRESETS: Record<PresetKey, Behaviour> = {
  client: {
    role: "source",
    capacity: Infinity,
    instances: 1,
    buffer: 0,
    hitRatio: 0,
    fanout: "all",
    latencyMs: 0,
    failRate: 0,
    rps: 100,
    timeoutMs: 0,
  },
  cache: {
    role: "service",
    capacity: 5000,
    instances: 1,
    buffer: 0,
    hitRatio: 0.8,
    fanout: "all",
    latencyMs: 10,
    failRate: 0,
    rps: 0,
    timeoutMs: 0,
  },
  loadBalancer: {
    role: "service",
    capacity: 20000,
    instances: 1,
    buffer: 0,
    hitRatio: 0,
    fanout: "split",
    latencyMs: 1,
    failRate: 0,
    rps: 0,
    timeoutMs: 0,
  },
  gateway: {
    role: "service",
    capacity: 10000,
    instances: 1,
    buffer: 0,
    hitRatio: 0,
    fanout: "all",
    latencyMs: 2,
    failRate: 0,
    rps: 0,
    timeoutMs: 0,
  },
  compute: {
    role: "service",
    capacity: 1000,
    instances: 1,
    buffer: 0,
    hitRatio: 0,
    fanout: "all",
    latencyMs: 20,
    failRate: 0,
    rps: 0,
    timeoutMs: 0,
  },
  database: {
    role: "service",
    capacity: 2000,
    instances: 1,
    buffer: 200,
    hitRatio: 0,
    fanout: "all",
    latencyMs: 5,
    failRate: 0,
    rps: 0,
    timeoutMs: 0,
  },
  queue: {
    role: "queue",
    capacity: 5000,
    instances: 1,
    buffer: 10000,
    hitRatio: 0,
    fanout: "all",
    latencyMs: 0,
    failRate: 0,
    rps: 0,
    timeoutMs: 0,
  },
  external: {
    role: "service",
    capacity: Infinity,
    instances: 1,
    buffer: 0,
    hitRatio: 0,
    fanout: "all",
    latencyMs: 200,
    failRate: 0,
    rps: 0,
    timeoutMs: 0,
  },
};

function bounded(
  value: unknown,
  range: { min: number; max: number },
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(range.max, Math.max(range.min, value));
}

export function sanitizeOverrides(raw: Record<string, unknown>): NodeOverrides {
  const clean: NodeOverrides = {};

  for (const key of NUMERIC_KEYS) {
    const value = bounded(raw[key], RANGES[key]);
    if (value === undefined) continue;
    clean[key] = key === "instances" ? Math.round(value) : value;
  }

  if (raw.fanout === "all" || raw.fanout === "split") {
    clean.fanout = raw.fanout as Fanout;
  }

  return clean;
}

export function sanitizeShare(value: unknown): number | undefined {
  return bounded(value, RANGES.share);
}

export function sanitizeRetries(value: unknown): number | undefined {
  const clamped = bounded(value, RANGES.retries);
  return clamped === undefined ? undefined : Math.round(clamped);
}

export function sanitizeBackoff(value: unknown): number | undefined {
  return bounded(value, RANGES.backoffMs);
}

export function resolveNode(input: NodeInput): SimNode {
  return {
    ...PRESETS[input.preset],
    ...sanitizeOverrides(input.overrides ?? {}),
    id: input.id,
  };
}

export function resolveEdge(input: EdgeInput): SimEdge {
  return {
    id: input.id,
    source: input.source,
    target: input.target,
    mode: input.mode === "async" ? "async" : "sync",
    share: sanitizeShare(input.share) ?? EDGE_DEFAULTS.share,
    retries: sanitizeRetries(input.retries) ?? EDGE_DEFAULTS.retries,
    backoffMs: sanitizeBackoff(input.backoffMs) ?? EDGE_DEFAULTS.backoffMs,
  };
}

export function resolveGraph(input: GraphInput): SimGraph {
  return {
    nodes: input.nodes.map(resolveNode),
    edges: input.edges.map(resolveEdge),
  };
}
