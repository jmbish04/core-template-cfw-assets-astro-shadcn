import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const NOTIFICATIONS_TABLE_DESCRIPTION =
  "Per-session inbox notifications surfaced in the UI notification tray.";

export const NOTIFICATIONS_COLUMN_DESCRIPTIONS: Record<string, string> = {
  id: "Auto-increment notification identifier.",
  session_key: "Foreign key (logical) into sessions.session_key — scopes the notification to a user.",
  type: "Categorical: info, warning, error, success.",
  title: "Short headline displayed in the tray.",
  message: "Body copy of the notification.",
  is_read: "1 if the user has dismissed/acknowledged, 0 otherwise.",
  created_at: "Unix timestamp (seconds) when the notification was emitted.",
};

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionKey: text("session_key").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const selectNotificationSchema = createSelectSchema(notifications);
export const insertNotificationSchema = createInsertSchema(notifications);
export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
