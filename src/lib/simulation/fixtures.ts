import type { Node, Edge } from "reactflow";
import type { TopologyNodeData } from "@/lib/types/topology";

export const fixtureNodes: Node<TopologyNodeData>[] = [
  {
    id: "client",
    position: { x: 40, y: 160 },
    data: { componentId: "client", label: "Client", category: "client" },
    type: "component",
  },
  {
    id: "lb",
    position: { x: 260, y: 160 },
    data: {
      componentId: "load-balancer",
      label: "Load Balancer",
      category: "networking",
    },
    type: "component",
  },
  {
    id: "api",
    position: { x: 480, y: 160 },
    data: {
      componentId: "api-server",
      label: "API Server",
      category: "compute",
    },
    type: "component",
  },
  {
    id: "db",
    position: { x: 700, y: 160 },
    data: {
      componentId: "postgresql",
      label: "PostgreSQL",
      category: "database",
    },
    type: "component",
  },
];

export const fixtureEdges: Edge[] = [
  { id: "client-lb", source: "client", target: "lb" },
  { id: "lb-api", source: "lb", target: "api" },
  { id: "api-db", source: "api", target: "db" },
];
