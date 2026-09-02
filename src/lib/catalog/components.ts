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
  { id: "client", label: "Client / Traffic Generator", category: "client" },

  { id: "load-balancer", label: "Load Balancer", category: "networking" },
  { id: "api-gateway", label: "API Gateway", category: "networking" },
  { id: "cdn", label: "CDN", category: "networking" },
  {
    id: "reverse-proxy",
    label: "Reverse Proxy (Nginx)",
    category: "networking",
  },

  { id: "api-server", label: "API Server", category: "compute" },
  {
    id: "serverless-function",
    label: "Serverless Function",
    category: "compute",
  },
  { id: "container", label: "Container (K8s Pod)", category: "compute" },
  { id: "background-worker", label: "Background Worker", category: "compute" },

  { id: "postgresql", label: "PostgreSQL", category: "database" },
  { id: "mysql", label: "MySQL", category: "database" },
  { id: "mongodb", label: "MongoDB", category: "database" },
  { id: "dynamodb", label: "DynamoDB", category: "database" },
  { id: "cassandra", label: "Cassandra", category: "database" },

  { id: "redis", label: "Redis", category: "cache" },
  { id: "memcached", label: "Memcached", category: "cache" },

  { id: "kafka", label: "Kafka", category: "messaging" },
  { id: "rabbitmq", label: "RabbitMQ", category: "messaging" },
  { id: "sqs", label: "SQS", category: "messaging" },
  { id: "pubsub", label: "Google Pub/Sub", category: "messaging" },

  { id: "auth0", label: "Auth0", category: "auth" },
  { id: "custom-jwt", label: "Custom JWT Server", category: "auth" },
  { id: "cognito", label: "Cognito", category: "auth" },
  { id: "firebase-auth", label: "Firebase Auth", category: "auth" },

  { id: "s3", label: "S3 / Object Storage", category: "storage" },
  { id: "gcs", label: "Google Cloud Storage", category: "storage" },
  { id: "blob-storage", label: "Azure Blob Storage", category: "storage" },

  { id: "elasticsearch", label: "Elasticsearch", category: "search" },
  { id: "algolia", label: "Algolia", category: "search" },
  { id: "meilisearch", label: "Meilisearch", category: "search" },
];

export function componentsByCategory(category: NodeCategory): ComponentDef[] {
  return componentCatalog.filter((c) => c.category === category);
}
