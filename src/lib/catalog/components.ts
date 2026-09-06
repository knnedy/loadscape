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
  { category: "networking", label: "Networking", icon: Network },
  { category: "compute", label: "Compute", icon: Server },
  { category: "database", label: "Database", icon: Database },
  { category: "cache", label: "Cache", icon: Zap },
  { category: "messaging", label: "Messaging", icon: MessageSquare },
  { category: "auth", label: "Auth", icon: Lock },
  { category: "storage", label: "Storage", icon: HardDrive },
  { category: "search", label: "Search", icon: Search },
  { category: "monitoring", label: "Monitoring", icon: Activity },
  { category: "ai", label: "AI & ML", icon: Brain },
  { category: "integrations", label: "Integrations", icon: Cable },
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
  },

  // CDN & edge
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
  },
  {
    id: "neon",
    label: "Neon",
    category: "database",
    group: "Postgres-compatible",
    icon: "logos:neon-icon",
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
  },
  {
    id: "planetscale",
    label: "PlanetScale",
    category: "database",
    group: "MySQL-compatible",
    icon: "logos:planetscale-icon",
  },

  // NoSQL & Edge
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
  },
  {
    id: "sqlite-turso",
    label: "Turso (SQLite)",
    category: "database",
    group: "Edge & Embedded",
    icon: "lucide:database",
  },

  // --- Cache ---
  { id: "redis", label: "Redis", category: "cache", icon: "logos:redis" },
  {
    id: "upstash-redis",
    label: "Upstash Redis",
    category: "cache",
    icon: "logos:upstash-icon",
  },
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
  },

  // --- Messaging ---
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
  },
  { id: "sqs", label: "AWS SQS", category: "messaging", icon: "logos:aws-sqs" },
  { id: "sns", label: "AWS SNS", category: "messaging", icon: "logos:aws-sns" },
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
  },

  // --- Storage ---
  {
    id: "s3",
    label: "S3 / Object Storage",
    category: "storage",
    icon: "logos:aws-s3",
  },
  {
    id: "cloudflare-r2",
    label: "Cloudflare R2",
    category: "storage",
    icon: "logos:cloudflare-icon",
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
