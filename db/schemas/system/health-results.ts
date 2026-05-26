import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { healthRuns } from "./health-runs";

export const healthResults = sqliteTable("health_results", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => healthRuns.id, { onDelete: "cascade" }),
  category: text("category", {
    enum: ["database", "ai", "providers", "agents", "google", "binding", "auth", "api", "custom"],
  }).notNull(),
  name: text("name").notNull(),
  status: text("status", {
    enum: ["ok", "warn", "fail", "skipped", "timeout"],
  }).notNull(),
  message: text("message"),
  details: text("details", { mode: "json" }).$type<Record<string, unknown>>(),
  durationMs: integer("duration_ms").notNull().default(0),
  aiSuggestion: text("ai_suggestion"),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertHealthResultSchema = createInsertSchema(healthResults);
export const selectHealthResultSchema = createSelectSchema(healthResults);
export type HealthResultRow = typeof healthResults.$inferSelect;
export type NewHealthResultRow = typeof healthResults.$inferInsert;
