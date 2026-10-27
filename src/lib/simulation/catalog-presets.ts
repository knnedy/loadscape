import type { NodeCategory } from "@/lib/types/topology";
import type { PresetKey } from "./presets";

const CATEGORY_PRESETS: Record<NodeCategory, PresetKey> = {
  client: "client",
  networking: "gateway",
  compute: "compute",
  database: "database",
  cache: "cache",
  messaging: "queue",
  auth: "external",
  storage: "external",
  search: "database",
  monitoring: "external",
  ai: "external",
  integrations: "external",
};

const COMPONENT_PRESETS: Record<string, PresetKey> = {
  "load-balancer": "loadBalancer",
  "aws-alb": "loadBalancer",
  "cloudflare-lb": "loadBalancer",
  "reverse-proxy": "loadBalancer",
  haproxy: "loadBalancer",
  cdn: "cache",
  "aws-cloudfront": "cache",
  "cloudflare-cdn": "cache",
  fastly: "cache",
  "custom-jwt": "compute",
  "next-auth": "compute",
  algolia: "external",
  pinecone: "database",
};

export function presetFor(
  componentId: string,
  category: NodeCategory,
): PresetKey {
  return COMPONENT_PRESETS[componentId] ?? CATEGORY_PRESETS[category];
}
