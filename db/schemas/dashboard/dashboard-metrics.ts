import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const dashboardMetrics = sqliteTable("dashboard_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metricName: text("metric_name").notNull(),
  metricValue: real("metric_value").notNull(),
  metricType: text("metric_type").notNull(),
  category: text("category").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const selectDashboardMetricSchema = createSelectSchema(dashboardMetrics);
export const insertDashboardMetricSchema = createInsertSchema(dashboardMetrics);
