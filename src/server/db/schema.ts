import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  AppNode,
  AppEdge,
} from "@/app/projects/[id]/_store/topology-store";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Untitled project"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("projects_user_id_idx").on(table.userId)],
);

export const topologies = pgTable("topologies", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  nodes: jsonb("nodes").$type<AppNode[]>().notNull().default([]),
  edges: jsonb("edges").$type<AppEdge[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      precision: 6,
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      precision: 6,
      withTimezone: true,
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  topology: one(topologies),
}));

export const topologiesRelations = relations(topologies, ({ one }) => ({
  project: one(projects, {
    fields: [topologies.projectId],
    references: [projects.id],
  }),
}));
