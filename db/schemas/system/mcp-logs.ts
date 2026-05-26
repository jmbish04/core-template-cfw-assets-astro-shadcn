import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const mcpLogs = sqliteTable("mcp_logs", {
  id: text("id").primaryKey(),
  serverName: text("server_name").notNull(),
  toolName: text("tool_name").notNull(),
  request: text("request", { mode: "json" }).$type<Record<string, unknown>>(),
  response: text("response", { mode: "json" }).$type<Record<string, unknown>>(),
  success: integer("success", { mode: "boolean" }).notNull().default(false),
  errorMessage: text("error_message"),
  latencyMs: integer("latency_ms").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertMcpLogSchema = createInsertSchema(mcpLogs);
export const selectMcpLogSchema = createSelectSchema(mcpLogs);
export type McpLogRow = typeof mcpLogs.$inferSelect;
export type NewMcpLogRow = typeof mcpLogs.$inferInsert;
