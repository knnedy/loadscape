import { categories, componentCatalog } from "@/lib/catalog/components";
import type { TopologyNodeData } from "@/lib/types/topology";
import type { AppEdge, AppNode } from "../_store/topology-store";

export type IssueSeverity = "error" | "warning";

export interface ReadinessIssue {
  id: string;
  severity: IssueSeverity;
  message: string;
  nodeId?: string;
}

export interface Readiness {
  componentCount: number;
  issues: ReadinessIssue[];
  errorCount: number;
  warningCount: number;
}

// The first catalog category holds the Client component, which originates
// traffic. Change this if the catalog order ever changes.
const TRAFFIC_SOURCE_CATEGORY = categories[0]?.category;
const TRAFFIC_SOURCE_LABEL =
  componentCatalog.find((c) => c.category === TRAFFIC_SOURCE_CATEGORY)?.label ??
  "traffic source";

const EMPTY: Readiness = {
  componentCount: 0,
  issues: [],
  errorCount: 0,
  warningCount: 0,
};

export function analyzeReadiness(
  nodes: AppNode[],
  edges: AppEdge[],
): Readiness {
  const components = nodes.filter((n) => n.type === "component");
  if (components.length === 0) return EMPTY;

  const connected = new Set<string>();
  for (const edge of edges) {
    connected.add(edge.source);
    connected.add(edge.target);
  }

  const issues: ReadinessIssue[] = [];

  const hasTrafficSource = components.some(
    (n) => (n.data as TopologyNodeData).category === TRAFFIC_SOURCE_CATEGORY,
  );
  if (!hasTrafficSource) {
    issues.push({
      id: "no-traffic-source",
      severity: "error",
      message: `Add a ${TRAFFIC_SOURCE_LABEL} to originate traffic.`,
    });
  }

  for (const node of components) {
    const data = node.data as TopologyNodeData;

    if (components.length > 1 && !connected.has(node.id)) {
      issues.push({
        id: `disconnected-${node.id}`,
        severity: "warning",
        message: `${data.label} isn't connected to anything.`,
        nodeId: node.id,
      });
    }

    if (!(typeof data.capacity === "number" && data.capacity > 0)) {
      issues.push({
        id: `capacity-${node.id}`,
        severity: "warning",
        message: `${data.label} has no capacity set.`,
        nodeId: node.id,
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  return {
    componentCount: components.length,
    issues: [...issues].sort(
      (a, b) => Number(b.severity === "error") - Number(a.severity === "error"),
    ),
    errorCount,
    warningCount: issues.length - errorCount,
  };
}
