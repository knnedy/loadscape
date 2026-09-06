export interface TemplateNode {
  componentId: string;
  x: number;
  y: number;
}

export interface TemplateEdge {
  from: number;
  to: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

export const templates: Template[] = [
  {
    id: "url-shortener",
    name: "URL Shortener",
    description: "Client → gateway → API → cache + persistent store",
    nodes: [
      { componentId: "client", x: 0, y: 100 },
      { componentId: "api-gateway", x: 220, y: 100 },
      { componentId: "api-server", x: 440, y: 100 },
      { componentId: "redis", x: 660, y: 20 },
      { componentId: "postgresql", x: 660, y: 180 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 2, to: 4 },
    ],
  },
  {
    id: "chat-backend",
    name: "Chat Backend",
    description: "Client → LB → API → cache, message history, event stream",
    nodes: [
      { componentId: "client", x: 0, y: 150 },
      { componentId: "load-balancer", x: 220, y: 150 },
      { componentId: "api-server", x: 440, y: 150 },
      { componentId: "redis", x: 660, y: 30 },
      { componentId: "postgresql", x: 660, y: 150 },
      { componentId: "kafka", x: 660, y: 270 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 2, to: 4 },
      { from: 2, to: 5 },
    ],
  },
  {
    id: "ecommerce-checkout",
    name: "E-commerce Checkout",
    description: "Client → CDN → API → payments, orders DB, order queue",
    nodes: [
      { componentId: "client", x: 0, y: 100 },
      { componentId: "cdn", x: 220, y: 100 },
      { componentId: "api-server", x: 440, y: 100 },
      { componentId: "stripe", x: 660, y: 10 },
      { componentId: "postgresql", x: 660, y: 100 },
      { componentId: "sqs", x: 660, y: 190 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 2, to: 4 },
      { from: 2, to: 5 },
    ],
  },
];
