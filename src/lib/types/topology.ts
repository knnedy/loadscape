import type { Fanout } from "@/lib/simulation/types";

export type NodeCategory =
  | "client"
  | "networking"
  | "compute"
  | "database"
  | "cache"
  | "messaging"
  | "auth"
  | "storage"
  | "search"
  | "monitoring"
  | "ai"
  | "integrations";

export interface TopologyNodeData extends Record<string, unknown> {
  componentId: string;
  label: string;
  category: NodeCategory;
  capacity?: number;
  instances?: number;
  buffer?: number;
  hitRatio?: number;
  fanout?: Fanout;
  latencyMs?: number;
  failRate?: number;
  rps?: number;
  timeoutMs?: number;
}

export interface TopologyGroupData extends Record<string, unknown> {
  label: string;
  color: string;
}

export interface TopologyNoteData extends Record<string, unknown> {
  text: string;
  color: string;
}

export interface TopologyEdgeData extends Record<string, unknown> {
  label?: string;
  style: EdgeStyle;
  direction: EdgeDirection;
  share?: number;
  retries?: number;
  backoffMs?: number;
  breakerThreshold?: number;
  breakerCooldownMs?: number;
}

export type EdgeStyle = "sync" | "async";
export type EdgeDirection = "forward" | "bidirectional" | "none";
