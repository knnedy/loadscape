import type { LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";
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
  Globe,
  CloudLightning,
  Cog,
} from "lucide-react";
import {
  SiNginx,
  SiKubernetes,
  SiPostgresql,
  SiMysql,
  SiMongodb,
  SiApachecassandra,
  SiRedis,
  SiApachekafka,
  SiRabbitmq,
  SiGooglecloud,
  SiAuth0,
  SiFirebase,
  SiElasticsearch,
  SiAlgolia,
} from "react-icons/si";
import type { NodeCategory } from "@/lib/types/topology";

export interface ComponentDef {
  id: string;
  label: string;
  category: NodeCategory;
  icon: LucideIcon | IconType;
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
    icon: Users,
  },

  {
    id: "load-balancer",
    label: "Load Balancer",
    category: "networking",
    icon: Scale,
  },
  {
    id: "api-gateway",
    label: "API Gateway",
    category: "networking",
    icon: Globe,
  },
  { id: "cdn", label: "CDN", category: "networking", icon: Globe },
  {
    id: "reverse-proxy",
    label: "Reverse Proxy (Nginx)",
    category: "networking",
    icon: SiNginx,
  },

  { id: "api-server", label: "API Server", category: "compute", icon: Server },
  {
    id: "serverless-function",
    label: "Serverless Function",
    category: "compute",
    icon: CloudLightning,
  },
  {
    id: "container",
    label: "Container (K8s Pod)",
    category: "compute",
    icon: SiKubernetes,
  },
  {
    id: "background-worker",
    label: "Background Worker",
    category: "compute",
    icon: Cog,
  },

  {
    id: "postgresql",
    label: "PostgreSQL",
    category: "database",
    icon: SiPostgresql,
  },
  { id: "mysql", label: "MySQL", category: "database", icon: SiMysql },
  { id: "mongodb", label: "MongoDB", category: "database", icon: SiMongodb },
  { id: "dynamodb", label: "DynamoDB", category: "database", icon: Database },
  {
    id: "cassandra",
    label: "Cassandra",
    category: "database",
    icon: SiApachecassandra,
  },

  { id: "redis", label: "Redis", category: "cache", icon: SiRedis },
  { id: "memcached", label: "Memcached", category: "cache", icon: Database },

  { id: "kafka", label: "Kafka", category: "messaging", icon: SiApachekafka },
  {
    id: "rabbitmq",
    label: "RabbitMQ",
    category: "messaging",
    icon: SiRabbitmq,
  },
  { id: "sqs", label: "SQS", category: "messaging", icon: MessageSquare },
  {
    id: "pubsub",
    label: "Google Pub/Sub",
    category: "messaging",
    icon: SiGooglecloud,
  },

  { id: "auth0", label: "Auth0", category: "auth", icon: SiAuth0 },
  {
    id: "custom-jwt",
    label: "Custom JWT Server",
    category: "auth",
    icon: Lock,
  },
  { id: "cognito", label: "Cognito", category: "auth", icon: Lock },
  {
    id: "firebase-auth",
    label: "Firebase Auth",
    category: "auth",
    icon: SiFirebase,
  },

  {
    id: "s3",
    label: "S3 / Object Storage",
    category: "storage",
    icon: HardDrive,
  },
  {
    id: "gcs",
    label: "Google Cloud Storage",
    category: "storage",
    icon: SiGooglecloud,
  },
  {
    id: "blob-storage",
    label: "Azure Blob Storage",
    category: "storage",
    icon: HardDrive,
  },

  {
    id: "elasticsearch",
    label: "Elasticsearch",
    category: "search",
    icon: SiElasticsearch,
  },
  { id: "algolia", label: "Algolia", category: "search", icon: SiAlgolia },
  { id: "meilisearch", label: "Meilisearch", category: "search", icon: Search },
];

export function componentsByCategory(category: NodeCategory): ComponentDef[] {
  return componentCatalog.filter((c) => c.category === category);
}
