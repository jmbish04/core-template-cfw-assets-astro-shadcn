import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const bestPractices = sqliteTable("best_practices", {
  id: text("id").primaryKey(),
  category: text("category", {
    enum: [
      "workers",
      "durable_objects",
      "agents",
      "frontend",
      "security",
      "observability",
      "custom",
    ],
  }).notNull(),
  rule: text("rule").notNull(),
  rationale: text("rationale").notNull(),
  sourceUrl: text("source_url"),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertBestPracticeSchema = createInsertSchema(bestPractices);
export const selectBestPracticeSchema = createSelectSchema(bestPractices);
export type BestPracticeRow = typeof bestPractices.$inferSelect;
export type NewBestPracticeRow = typeof bestPractices.$inferInsert;
