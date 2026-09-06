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

export interface TopologyNodeData {
  componentId: string;
  label: string;
  category: NodeCategory;
  capacity?: number;
}

export type EdgeStyle = "sync" | "async";
export type EdgeDirection = "forward" | "bidirectional" | "none";

export interface TopologyEdgeData {
  label?: string;
  style: EdgeStyle;
  direction: EdgeDirection;
}

export interface TopologyGroupData {
  label: string;
  color: string;
}
