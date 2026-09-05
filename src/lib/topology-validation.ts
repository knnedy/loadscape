import type { Connection, Edge } from "reactflow";

export function isConnectionValid(
  connection: Connection,
  edges: Edge[],
  excludeEdgeId?: string,
): boolean {
  if (!connection.source || !connection.target) return false;
  if (connection.source === connection.target) return false;
  return !edges.some(
    (e) =>
      e.id !== excludeEdgeId &&
      e.source === connection.source &&
      e.target === connection.target,
  );
}
