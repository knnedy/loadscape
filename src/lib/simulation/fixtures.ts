import { MarkerType, type Node, type Edge } from "reactflow";
import type { TopologyNodeData, TopologyEdgeData } from "@/lib/types/topology";

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

export const fixtureEdges: Edge<TopologyEdgeData>[] = [
  {
    id: "client-lb",
    source: "client",
    target: "lb",
    type: "component",
    data: { style: "sync", direction: "forward" },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "lb-api",
    source: "lb",
    target: "api",
    type: "component",
    data: { style: "sync", direction: "forward" },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "api-db",
    source: "api",
    target: "db",
    type: "component",
    data: { style: "sync", direction: "forward" },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];
