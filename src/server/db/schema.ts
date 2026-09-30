import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type {
  AppNode,
  AppEdge,
} from "@/app/projects/[id]/_store/topology-store";

export const projects = pgTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    name: text("name").notNull().default("Untitled project"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("projects_user_id_idx").on(table.userId)],
);

export const topologies = pgTable("topologies", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  nodes: jsonb("nodes").$type<AppNode[]>().notNull().default([]),
  edges: jsonb("edges").$type<AppEdge[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
