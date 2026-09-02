export type NodeCategory =
  | "client"
  | "networking"
  | "compute"
  | "database"
  | "cache"
  | "messaging"
  | "auth"
  | "storage"
  | "search";

export interface TopologyNodeData {
  componentId: string;
  label: string;
  category: NodeCategory;
  capacity?: number;
}
