import type { LucideIcon } from "lucide-react";
import {
  Users,
  Network,
  Server,
  Database,
  Zap,
  MessageSquare,
  Lock,
  HardDrive,
  Search,
  Activity,
  Brain,
  Cable,
} from "lucide-react";
import type { NodeCategory } from "@/lib/types/topology";

export type CategoryFamily =
  | "transport"
  | "compute"
  | "persistence"
  | "coordination"
  | "trust"
  | "external";

export interface ComponentDef {
  id: string;
  label: string;
  category: NodeCategory;
  group?: string;
  icon: string;
  /** Static tech-level fact (e.g. "LRU eviction"), not config- or sim-derived */
  annotation?: string;
}

export interface CategoryDef {
  category: NodeCategory;
  label: string;
  icon: LucideIcon;
  family: CategoryFamily;
  shape: "capsule" | "rect";
  defaultAnnotation: string;
}

export const categories: CategoryDef[] = [
  {
    category: "client",
    label: "Client",
    icon: Users,
    family: "transport",
    shape: "capsule",
    defaultAnnotation: "originates traffic",
  },
  {
    category: "networking",
    label: "Networking",
    icon: Network,
    family: "transport",
    shape: "rect",
    defaultAnnotation: "routes traffic",
  },
  {
    category: "compute",
    label: "Compute",
    icon: Server,
    family: "compute",
    shape: "rect",
    defaultAnnotation: "processes requests",
  },
  {
    category: "database",
    label: "Database",
    icon: Database,
    family: "persistence",
    shape: "rect",
    defaultAnnotation: "persists state",
  },
  {
    category: "cache",
    label: "Cache",
    icon: Zap,
    family: "persistence",
    shape: "rect",
    defaultAnnotation: "ephemeral, fast",
  },
  {
    category: "messaging",
    label: "Messaging",
    icon: MessageSquare,
    family: "coordination",
    shape: "rect",
    defaultAnnotation: "decouples flow",
  },
  {
    category: "auth",
    label: "Auth",
    icon: Lock,
    family: "trust",
    shape: "rect",
    defaultAnnotation: "gatekeeps access",
  },
  {
    category: "storage",
    label: "Storage",
    icon: HardDrive,
    family: "persistence",
    shape: "rect",
    defaultAnnotation: "stores blobs",
  },
  {
    category: "search",
    label: "Search",
    icon: Search,
    family: "persistence",
    shape: "rect",
    defaultAnnotation: "indexes for query",
  },
  {
    category: "monitoring",
    label: "Monitoring",
    icon: Activity,
    family: "trust",
    shape: "rect",
    defaultAnnotation: "observes the system",
  },
  {
    category: "ai",
    label: "AI & ML",
    icon: Brain,
    family: "compute",
    shape: "rect",
    defaultAnnotation: "runs inference",
  },
  {
    category: "integrations",
    label: "Integrations",
    icon: Cable,
    family: "external",
    shape: "rect",
    defaultAnnotation: "external, no capacity",
  },
];

export const componentCatalog: ComponentDef[] = [
  // --- Client ---
  {
    id: "client",
    label: "Client / Traffic Generator",
    category: "client",
    icon: "lucide:users",
  },
  {
    id: "browser",
    label: "Web Browser",
    category: "client",
    group: "Platforms",
    icon: "lucide:monitor",
  },
  {
    id: "mobile-app",
    label: "Mobile App",
    category: "client",
    group: "Platforms",
    icon: "lucide:smartphone",
  },
  {
    id: "iot-device",
    label: "IoT Device",
    category: "client",
    group: "Platforms",
    icon: "lucide:cpu",
  },

  // --- Networking ---
  // Load balancing
  {
    id: "load-balancer",
    label: "Generic",
    category: "networking",
    group: "Load balancing",
    icon: "lucide:scale",
    annotation: "round robin",
  },
  {
    id: "aws-alb",
    label: "AWS Application LB",
    category: "networking",
    group: "Load balancing",
    icon: "logos:aws",
    annotation: "least outstanding requests",
  },
  {
    id: "cloudflare-lb",
    label: "Cloudflare Load Balancing",
    category: "networking",
    group: "Load balancing",
    icon: "logos:cloudflare-icon",
  },
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
    annotation: "least connections",
  },

  // CDN & edge
  {
    id: "cdn",
    label: "Generic CDN",
    category: "networking",
    group: "CDN & edge",
    icon: "lucide:globe",
    annotation: "caches at the edge",
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
  },
  {
    id: "fastly",
    label: "Fastly",
    category: "networking",
    group: "CDN & edge",
    icon: "logos:fastly-icon",
  },

  // API & security
  {
    id: "api-gateway",
    label: "API Gateway",
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
  },
  {
    id: "captcha",
    label: "Captcha",
    category: "networking",
    group: "API & security",
    icon: "lucide:shield-check",
  },

  // DNS & Routing
  {
    id: "aws-route53",
    label: "AWS Route 53",
    category: "networking",
    group: "DNS & Routing",
    icon: "logos:aws-route53",
  },
  {
    id: "dns-generic",
    label: "DNS Provider",
    category: "networking",
    group: "DNS & Routing",
    icon: "lucide:network",
  },

  // --- Compute ---
  // Serverless
  {
    id: "serverless-function",
    label: "Generic Serverless Function",
    category: "compute",
    group: "Serverless",
    icon: "lucide:cloud-lightning",
    annotation: "cold starts",
  },
  {
    id: "aws-lambda",
    label: "AWS Lambda",
    category: "compute",
    group: "Serverless",
    icon: "logos:aws-lambda",
    annotation: "cold starts",
  },
  {
    id: "cloudflare-workers",
    label: "Cloudflare Workers",
    category: "compute",
    group: "Serverless",
    icon: "logos:cloudflare-icon",
    annotation: "no cold starts",
  },
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

  // Containers & platforms
  {
    id: "container",
    label: "Kubernetes Pod",
    category: "compute",
    group: "Containers & platforms",
    icon: "logos:kubernetes",
    annotation: "horizontally scalable",
  },
  {
    id: "docker",
    label: "Docker Container",
    category: "compute",
    group: "Containers & platforms",
    icon: "logos:docker-icon",
  },
  {
    id: "aws-ecs",
    label: "AWS ECS / Fargate",
    category: "compute",
    group: "Containers & platforms",
    icon: "logos:aws-ecs",
  },
  {
    id: "aws-amplify",
    label: "AWS Amplify",
    category: "compute",
    group: "Containers & platforms",
    icon: "logos:aws-amplify",
  },

  // Servers & Frameworks
  {
    id: "api-server",
    label: "API Server",
    category: "compute",
    group: "Servers",
    icon: "lucide:server",
  },
  {
    id: "go-server",
    label: "Go Backend",
    category: "compute",
    group: "Servers",
    icon: "logos:go",
  },
  {
    id: "nextjs-server",
    label: "Next.js App",
    category: "compute",
    group: "Servers",
    icon: "logos:nextjs-icon",
  },
  {
    id: "background-worker",
    label: "Background Worker",
    category: "compute",
    group: "Servers",
    icon: "lucide:cog",
  },
  {
    id: "aws-ec2",
    label: "AWS EC2",
    category: "compute",
    group: "Servers",
    icon: "logos:aws-ec2",
  },

  // --- Database ---
  // Postgres-compatible
  {
    id: "postgresql",
    label: "PostgreSQL",
    category: "database",
    group: "Postgres-compatible",
    icon: "logos:postgresql",
    annotation: "ACID, single writer",
  },
  {
    id: "neon",
    label: "Neon",
    category: "database",
    group: "Postgres-compatible",
    icon: "logos:neon-icon",
    annotation: "serverless, branchable",
  },
  {
    id: "supabase",
    label: "Supabase",
    category: "database",
    group: "Postgres-compatible",
    icon: "logos:supabase-icon",
  },

  // MySQL-compatible
  {
    id: "mysql",
    label: "MySQL",
    category: "database",
    group: "MySQL-compatible",
    icon: "logos:mysql",
    annotation: "ACID, single writer",
  },
  {
    id: "planetscale",
    label: "PlanetScale",
    category: "database",
    group: "MySQL-compatible",
    icon: "logos:planetscale-icon",
    annotation: "online schema changes",
  },

  // NoSQL & Edge
  {
    id: "mongodb",
    label: "MongoDB",
    category: "database",
    group: "NoSQL",
    icon: "logos:mongodb-icon",
    annotation: "eventually consistent",
  },
  {
    id: "dynamodb",
    label: "DynamoDB",
    category: "database",
    group: "NoSQL",
    icon: "logos:aws-dynamodb",
    annotation: "auto-scales throughput",
  },
  {
    id: "cassandra",
    label: "Cassandra",
    category: "database",
    group: "NoSQL",
    icon: "logos:apache-cassandra",
    annotation: "no single point of failure",
  },
  {
    id: "sqlite-turso",
    label: "Turso (SQLite)",
    category: "database",
    group: "Edge & Embedded",
    icon: "lucide:database",
    annotation: "embedded, edge-replicated",
  },

  // --- Cache ---
  {
    id: "redis",
    label: "Redis",
    category: "cache",
    icon: "logos:redis",
    annotation: "LRU eviction",
  },
  {
    id: "upstash-redis",
    label: "Upstash Redis",
    category: "cache",
    icon: "logos:upstash-icon",
    annotation: "LRU eviction",
  },
  {
    id: "memcached",
    label: "Memcached",
    category: "cache",
    icon: "lucide:database",
    annotation: "no persistence",
  },
  {
    id: "cloudflare-kv",
    label: "Cloudflare KV",
    category: "cache",
    icon: "logos:cloudflare-icon",
    annotation: "eventually consistent",
  },

  // --- Messaging ---
  {
    id: "kafka",
    label: "Kafka",
    category: "messaging",
    icon: "logos:kafka-icon",
    annotation: "ordered per partition",
  },
  {
    id: "rabbitmq",
    label: "RabbitMQ",
    category: "messaging",
    icon: "logos:rabbitmq-icon",
    annotation: "AMQP broker",
  },
  {
    id: "sqs",
    label: "AWS SQS",
    category: "messaging",
    icon: "logos:aws-sqs",
    annotation: "at-least-once delivery",
  },
  {
    id: "sns",
    label: "AWS SNS",
    category: "messaging",
    icon: "logos:aws-sns",
    annotation: "fan-out pub/sub",
  },
  {
    id: "eventbridge",
    label: "AWS EventBridge",
    category: "messaging",
    icon: "logos:aws-eventbridge",
  },
  {
    id: "pubsub",
    label: "Google Pub/Sub",
    category: "messaging",
    icon: "logos:google-cloud",
    annotation: "at-least-once delivery",
  },

  // --- Auth ---
  { id: "auth0", label: "Auth0", category: "auth", icon: "logos:auth0-icon" },
  { id: "clerk", label: "Clerk", category: "auth", icon: "lucide:lock" },
  {
    id: "cognito",
    label: "AWS Cognito",
    category: "auth",
    icon: "logos:aws-cognito",
  },
  {
    id: "firebase-auth",
    label: "Firebase Auth",
    category: "auth",
    icon: "logos:firebase-icon",
  },
  {
    id: "next-auth",
    label: "NextAuth.js",
    category: "auth",
    icon: "lucide:shield",
  },
  {
    id: "custom-jwt",
    label: "Custom JWT Server",
    category: "auth",
    icon: "lucide:lock",
    annotation: "stateless tokens",
  },

  // --- Storage ---
  {
    id: "s3",
    label: "S3 / Object Storage",
    category: "storage",
    icon: "logos:aws-s3",
    annotation: "eventually consistent",
  },
  {
    id: "cloudflare-r2",
    label: "Cloudflare R2",
    category: "storage",
    icon: "logos:cloudflare-icon",
    annotation: "no egress fees",
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
  },

  // --- Search ---
  {
    id: "elasticsearch",
    label: "Elasticsearch",
    category: "search",
    icon: "logos:elasticsearch",
    annotation: "eventually consistent",
  },
  {
    id: "algolia",
    label: "Algolia",
    category: "search",
    icon: "logos:algolia",
    annotation: "hosted, low-latency",
  },
  {
    id: "meilisearch",
    label: "Meilisearch",
    category: "search",
    icon: "lucide:search",
  },

  // --- Monitoring & Observability ---
  {
    id: "datadog",
    label: "Datadog",
    category: "monitoring",
    icon: "logos:datadog-icon",
  },
  {
    id: "grafana",
    label: "Grafana",
    category: "monitoring",
    icon: "logos:grafana",
  },
  {
    id: "prometheus",
    label: "Prometheus",
    category: "monitoring",
    icon: "logos:prometheus",
    annotation: "pull-based scraping",
  },
  {
    id: "sentry",
    label: "Sentry",
    category: "monitoring",
    icon: "logos:sentry-icon",
  },
  {
    id: "cloudwatch",
    label: "AWS CloudWatch",
    category: "monitoring",
    icon: "logos:aws-cloudwatch",
  },

  // --- AI & ML ---
  {
    id: "openai",
    label: "OpenAI API",
    category: "ai",
    icon: "logos:openai-icon",
    annotation: "external, rate-limited",
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    category: "ai",
    icon: "logos:huggingface-icon",
  },
  {
    id: "pinecone",
    label: "Pinecone (Vector DB)",
    category: "ai",
    icon: "lucide:database",
    annotation: "approximate nearest-neighbor",
  },

  // --- Integrations / Third-Party ---
  {
    id: "stripe",
    label: "Stripe",
    category: "integrations",
    icon: "logos:stripe",
  },
  {
    id: "twilio",
    label: "Twilio",
    category: "integrations",
    icon: "logos:twilio-icon",
  },
  {
    id: "sendgrid",
    label: "SendGrid",
    category: "integrations",
    icon: "logos:sendgrid-icon",
  },
  {
    id: "daraja-api",
    label: "Daraja API",
    category: "integrations",
    icon: "lucide:plug",
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

export function getCategoryDef(category: NodeCategory): CategoryDef {
  const def = categories.find((c) => c.category === category);
  if (!def) throw new Error(`Unknown category: ${category}`);
  return def;
}

/** Resolves the annotation to show for a component: its own override, or the category default. */
export function getAnnotation(component: ComponentDef): string {
  return (
    component.annotation ?? getCategoryDef(component.category).defaultAnnotation
  );
}
