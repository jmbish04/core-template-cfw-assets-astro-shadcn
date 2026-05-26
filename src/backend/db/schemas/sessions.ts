import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const SESSIONS_TABLE_DESCRIPTION =
  "Bearer-token authenticated sessions. Used by the Hono auth middleware to validate API requests.";

export const SESSIONS_COLUMN_DESCRIPTIONS: Record<string, string> = {
  id: "Auto-increment session identifier.",
  token: "Opaque bearer token sent in the Authorization header.",
  session_key: "User-bound key used to scope per-user resources (notifications, threads, etc.).",
  expires_at: "Unix timestamp (seconds) after which the session is invalid.",
  created_at: "Unix timestamp (seconds) when the session was issued.",
  updated_at: "Unix timestamp (seconds) of the most recent refresh.",
};

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  sessionKey: text("session_key").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const selectSessionSchema = createSelectSchema(sessions);
export const insertSessionSchema = createInsertSchema(sessions);
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
