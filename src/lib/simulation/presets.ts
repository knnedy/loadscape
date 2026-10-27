import type { Fanout, SimEdge, SimGraph, SimNode, EdgeMode } from "./types";

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
}

export interface GraphInput {
  nodes: NodeInput[];
  edges: EdgeInput[];
}

const MAX_INSTANCES = 10_000;

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
  },
};

function clamp(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function resolveNode(input: NodeInput): SimNode {
  const base = PRESETS[input.preset];
  const o = input.overrides ?? {};
  const fanout: Fanout =
    o.fanout === "all" || o.fanout === "split" ? o.fanout : base.fanout;

  return {
    id: input.id,
    role: base.role,
    capacity: clamp(o.capacity, base.capacity, 1, Infinity),
    instances: Math.round(clamp(o.instances, base.instances, 1, MAX_INSTANCES)),
    buffer: clamp(o.buffer, base.buffer, 0, Infinity),
    hitRatio: clamp(o.hitRatio, base.hitRatio, 0, 1),
    fanout,
    latencyMs: clamp(o.latencyMs, base.latencyMs, 0, Infinity),
    failRate: clamp(o.failRate, base.failRate, 0, 1),
    rps: clamp(o.rps, base.rps, 0, Infinity),
  };
}

export function resolveEdge(input: EdgeInput): SimEdge {
  return {
    id: input.id,
    source: input.source,
    target: input.target,
    mode: input.mode === "async" ? "async" : "sync",
    share: clamp(input.share, 1, 0, 1),
  };
}

export function resolveGraph(input: GraphInput): SimGraph {
  return {
    nodes: input.nodes.map(resolveNode),
    edges: input.edges.map(resolveEdge),
  };
}
