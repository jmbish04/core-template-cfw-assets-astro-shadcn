import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const threads = sqliteTable("threads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Session-owned records stay grouped by the authenticated session key without a direct FK
  // so content is not cascade-deleted when short-lived sessions are revoked or rotated.
  sessionKey: text("session_key").notNull(),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const selectThreadSchema = createSelectSchema(threads);
export const insertThreadSchema = createInsertSchema(threads);
