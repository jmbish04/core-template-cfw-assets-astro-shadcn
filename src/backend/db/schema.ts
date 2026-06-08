/**
 * @fileoverview Drizzle schema barrel — single source of truth for the
 * template's D1 tables.
 *
 * This lean template ships a small, generic set of tables that support the
 * showcase surfaces (config, health, dashboard metrics, notifications, agent
 * human-in-the-loop proposals, MCP request logs, job-failure logging, and
 * session auth). Add new domain tables under `./schemas/<name>.ts` and
 * re-export them here.
 */

export * from "./schemas/global-config";
export * from "./schemas/job-failures";

export * from "./schemas/health";
export * from "./schemas/health-checks";

export * from "./schemas/best-practices";
export * from "./schemas/hitl-proposals";
export * from "./schemas/mcp-logs";

export * from "./schemas/sessions";
export * from "./schemas/dashboard-metrics";
export * from "./schemas/notifications";
