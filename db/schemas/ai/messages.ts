import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { threads } from "./threads";

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  threadId: integer("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const selectMessageSchema = createSelectSchema(messages);
export const insertMessageSchema = createInsertSchema(messages);
