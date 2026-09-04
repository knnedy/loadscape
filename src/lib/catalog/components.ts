import type { LucideIcon } from "lucide-react";
import {
  Users,
  Scale,
  Server,
  Database,
  Zap,
  MessageSquare,
  Lock,
  HardDrive,
  Search,
} from "lucide-react";
import type { NodeCategory } from "@/lib/types/topology";

export interface ComponentDef {
  id: string;
  label: string;
  category: NodeCategory;
  group?: string;
  icon: string;
}

export interface CategoryDef {
  category: NodeCategory;
  label: string;
  icon: LucideIcon;
}

export const categories: CategoryDef[] = [
  { category: "client", label: "Client", icon: Users },
  { category: "networking", label: "Networking", icon: Scale },
  { category: "compute", label: "Compute", icon: Server },
  { category: "database", label: "Database", icon: Database },
  { category: "cache", label: "Cache", icon: Zap },
  { category: "messaging", label: "Messaging", icon: MessageSquare },
  { category: "auth", label: "Auth", icon: Lock },
  { category: "storage", label: "Storage", icon: HardDrive },
  { category: "search", label: "Search", icon: Search },
];

export const componentCatalog: ComponentDef[] = [
  {
    id: "client",
    label: "Client / Traffic Generator",
    category: "client",
    icon: "lucide:users",
  },

  // Networking — load balancing
  {
    id: "load-balancer",
    label: "Generic Load Balancer",
    category: "networking",
    group: "Load balancing",
    icon: "lucide:scale",
  },
  {
    id: "aws-alb",
    label: "AWS Application LB",
    category: "networking",
    group: "Load balancing",
    icon: "logos:aws",
  },
  {
    id: "cloudflare-lb",
    label: "Cloudflare Load Balancing",
    category: "networking",
    group: "Load balancing",
    icon: "logos:cloudflare-icon",
  }, // verify slug
  {
    id: "reverse-proxy",
    label: "Nginx",
    category: "networking",
    group: "Load balancing",
    icon: "logos:nginx",
  },
  {
    id: "haproxy",
    label: "HAProxy",
    category: "networking",
    group: "Load balancing",
    icon: "lucide:scale",
  }, // no verified logos: entry

  // Networking — CDN & edge
  {
    id: "cdn",
    label: "Generic CDN",
    category: "networking",
    group: "CDN & edge",
    icon: "lucide:globe",
  },
  {
    id: "aws-cloudfront",
    label: "AWS CloudFront",
    category: "networking",
    group: "CDN & edge",
    icon: "logos:aws-cloudfront",
  },
  {
    id: "cloudflare-cdn",
    label: "Cloudflare CDN",
    category: "networking",
    group: "CDN & edge",
    icon: "logos:cloudflare-icon",
  }, // verify slug
  {
    id: "fastly",
    label: "Fastly",
    category: "networking",
    group: "CDN & edge",
    icon: "logos:fastly-icon",
  }, // verify slug

  // Networking — API & security
  {
    id: "api-gateway",
    label: "API Gateway (generic)",
    category: "networking",
    group: "API & security",
    icon: "lucide:route",
  },
  {
    id: "aws-api-gateway",
    label: "AWS API Gateway",
    category: "networking",
    group: "API & security",
    icon: "logos:aws-api-gateway",
  },
  {
    id: "cloudflare-waf",
    label: "Cloudflare WAF",
    category: "networking",
    group: "API & security",
    icon: "logos:cloudflare-icon",
  }, // verify slug
  {
    id: "captcha",
    label: "Captcha (reCAPTCHA / Turnstile)",
    category: "networking",
    group: "API & security",
    icon: "lucide:shield-check",
  },

  // Compute — serverless
  {
    id: "serverless-function",
    label: "Generic Serverless Function",
    category: "compute",
    group: "Serverless",
    icon: "lucide:cloud-lightning",
  },
  {
    id: "aws-lambda",
    label: "AWS Lambda",
    category: "compute",
    group: "Serverless",
    icon: "logos:aws-lambda",
  },
  {
    id: "cloudflare-workers",
    label: "Cloudflare Workers",
    category: "compute",
    group: "Serverless",
    icon: "logos:cloudflare-icon",
  }, // verify slug
  {
    id: "vercel-functions",
    label: "Vercel Functions",
    category: "compute",
    group: "Serverless",
    icon: "logos:vercel-icon",
  },
  {
    id: "gcp-functions",
    label: "Google Cloud Functions",
    category: "compute",
    group: "Serverless",
    icon: "logos:google-cloud",
  },

  // Compute — containers & platforms
  {
    id: "container",
    label: "Kubernetes Pod",
    category: "compute",
    group: "Containers & platforms",
    icon: "logos:kubernetes",
  },
  {
    id: "docker",
    label: "Docker Container",
    category: "compute",
    group: "Containers & platforms",
    icon: "logos:docker-icon",
  },
  {
    id: "aws-amplify",
    label: "AWS Amplify",
    category: "compute",
    group: "Containers & platforms",
    icon: "logos:aws-amplify",
  }, // verify slug

  // Compute — servers
  {
    id: "api-server",
    label: "API Server",
    category: "compute",
    group: "Servers",
    icon: "lucide:server",
  },
  {
    id: "background-worker",
    label: "Background Worker",
    category: "compute",
    group: "Servers",
    icon: "lucide:cog",
  },

  // Database — Postgres-compatible
  {
    id: "postgresql",
    label: "PostgreSQL",
    category: "database",
    group: "Postgres-compatible",
    icon: "logos:postgresql",
  },
  {
    id: "neon",
    label: "Neon",
    category: "database",
    group: "Postgres-compatible",
    icon: "logos:neon-icon",
  }, // verify slug
  {
    id: "supabase",
    label: "Supabase",
    category: "database",
    group: "Postgres-compatible",
    icon: "logos:supabase-icon",
  },

  // Database — MySQL-compatible
  {
    id: "mysql",
    label: "MySQL",
    category: "database",
    group: "MySQL-compatible",
    icon: "logos:mysql",
  },
  {
    id: "planetscale",
    label: "PlanetScale",
    category: "database",
    group: "MySQL-compatible",
    icon: "logos:planetscale-icon",
  }, // verify slug

  // Database — NoSQL
  {
    id: "mongodb",
    label: "MongoDB",
    category: "database",
    group: "NoSQL",
    icon: "logos:mongodb-icon",
  },
  {
    id: "dynamodb",
    label: "DynamoDB",
    category: "database",
    group: "NoSQL",
    icon: "logos:aws-dynamodb",
  },
  {
    id: "cassandra",
    label: "Cassandra",
    category: "database",
    group: "NoSQL",
    icon: "logos:apache-cassandra",
  }, // verify slug

  // Cache
  { id: "redis", label: "Redis", category: "cache", icon: "logos:redis" },
  {
    id: "memcached",
    label: "Memcached",
    category: "cache",
    icon: "lucide:database",
  },
  {
    id: "cloudflare-kv",
    label: "Cloudflare KV",
    category: "cache",
    icon: "logos:cloudflare-icon",
  }, // verify slug

  // Messaging
  {
    id: "kafka",
    label: "Kafka",
    category: "messaging",
    icon: "logos:kafka-icon",
  },
  {
    id: "rabbitmq",
    label: "RabbitMQ",
    category: "messaging",
    icon: "logos:rabbitmq-icon",
  }, // double-check visually
  { id: "sqs", label: "SQS", category: "messaging", icon: "logos:aws-sqs" },
  {
    id: "pubsub",
    label: "Google Pub/Sub",
    category: "messaging",
    icon: "logos:google-cloud",
  },

  // Auth
  { id: "auth0", label: "Auth0", category: "auth", icon: "logos:auth0-icon" }, // verify slug
  {
    id: "custom-jwt",
    label: "Custom JWT Server",
    category: "auth",
    icon: "lucide:lock",
  },
  {
    id: "cognito",
    label: "Cognito",
    category: "auth",
    icon: "logos:aws-cognito",
  },
  {
    id: "firebase-auth",
    label: "Firebase Auth",
    category: "auth",
    icon: "logos:firebase-icon",
  }, // fixed: was wordmark
  { id: "clerk", label: "Clerk", category: "auth", icon: "lucide:lock" }, // no verified logos: entry

  // Storage
  {
    id: "s3",
    label: "S3 / Object Storage",
    category: "storage",
    icon: "logos:aws-s3",
  },
  {
    id: "gcs",
    label: "Google Cloud Storage",
    category: "storage",
    icon: "logos:google-cloud",
  },
  {
    id: "blob-storage",
    label: "Azure Blob Storage",
    category: "storage",
    icon: "logos:microsoft-azure",
  }, // verify slug
  {
    id: "cloudflare-r2",
    label: "Cloudflare R2",
    category: "storage",
    icon: "logos:cloudflare-icon",
  }, // verify slug

  // Search
  {
    id: "elasticsearch",
    label: "Elasticsearch",
    category: "search",
    icon: "logos:elasticsearch",
  },
  {
    id: "algolia",
    label: "Algolia",
    category: "search",
    icon: "logos:algolia",
  },
  {
    id: "meilisearch",
    label: "Meilisearch",
    category: "search",
    icon: "lucide:search",
  },
];

export function componentsByCategory(category: NodeCategory): ComponentDef[] {
  return componentCatalog.filter((c) => c.category === category);
}

export function groupedComponentsByCategory(
  category: NodeCategory,
): Map<string, ComponentDef[]> {
  const items = componentsByCategory(category);
  const groups = new Map<string, ComponentDef[]>();
  for (const item of items) {
    const key = item.group ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}
