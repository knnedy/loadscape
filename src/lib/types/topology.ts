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
}

export type EdgeStyle = "sync" | "async";
export type EdgeDirection = "forward" | "bidirectional" | "none";
