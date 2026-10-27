import { categories, componentCatalog } from "@/lib/catalog/components";
import { fromTopology } from "@/lib/simulation/from-topology";
import { orderGraph } from "@/lib/simulation/graph";
import { resolveGraph } from "@/lib/simulation/presets";
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
  canRun: boolean;
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
  canRun: false,
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
  } else {
    // The engine decides what can run, so the UI and the engine can't disagree.
    const ordered = orderGraph(resolveGraph(fromTopology(nodes, edges)));
    if (!ordered.ok) {
      issues.push({ id: "graph", severity: "error", message: ordered.error });
    }
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
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  return {
    componentCount: components.length,
    issues: [...issues].sort(
      (a, b) => Number(b.severity === "error") - Number(a.severity === "error"),
    ),
    errorCount,
    warningCount: issues.length - errorCount,
    canRun: errorCount === 0,
  };
}
