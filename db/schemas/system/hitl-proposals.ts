import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const hitlProposals = sqliteTable("hitl_proposals", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  instanceName: text("instance_name").notNull(),
  actionType: text("action_type", {
    enum: ["form_fill", "navigation", "click", "file_write", "external_call", "custom"],
  }).notNull(),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "expired", "executed"],
  })
    .notNull()
    .default("pending"),
  approvedBy: text("approved_by"),
  decisionReason: text("decision_reason"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  decidedAt: integer("decided_at", { mode: "timestamp" }),
});

export const insertHitlProposalSchema = createInsertSchema(hitlProposals);
export const selectHitlProposalSchema = createSelectSchema(hitlProposals);
export type HitlProposalRow = typeof hitlProposals.$inferSelect;
export type NewHitlProposalRow = typeof hitlProposals.$inferInsert;
