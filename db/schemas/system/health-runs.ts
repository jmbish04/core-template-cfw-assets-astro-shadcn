import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const healthRuns = sqliteTable("health_runs", {
  id: text("id").primaryKey(),
  status: text("status", { enum: ["healthy", "degraded", "unhealthy", "unknown"] })
    .notNull()
    .default("unknown"),
  trigger: text("trigger", { enum: ["manual", "scheduled", "agent"] }).notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
});

export const insertHealthRunSchema = createInsertSchema(healthRuns);
export const selectHealthRunSchema = createSelectSchema(healthRuns);
export type HealthRunRow = typeof healthRuns.$inferSelect;
export type NewHealthRunRow = typeof healthRuns.$inferInsert;
