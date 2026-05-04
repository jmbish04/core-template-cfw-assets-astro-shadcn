import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { roles } from "./roles";

// ---------------------------------------------------------------------------
// Table & column documentation (consumed by /api/docs/schema)
// ---------------------------------------------------------------------------

/** Human-readable description of the `emails` table for the documentation UI. */
export const EMAILS_TABLE_DESCRIPTION =
  "Inbound recruiting emails captured by the Worker email handler. Each email is matched to a role or left for manual association.";

/** Per-column descriptions surfaced in the documentation schema viewer. */
export const EMAILS_COLUMN_DESCRIPTIONS: Record<string, string> = {
  id: "UUID primary key, generated at creation.",
  role_id:
    "Optional foreign key to the associated role. Set null on role deletion to preserve email history.",
  subject: "Email subject line.",
  body: "Parsed email body text (HTML stripped).",
  sender: "Sender email address.",
  raw_content: "Full raw email content (headers + body) for re-processing or debugging.",
  processed_status:
    "Email lifecycle status. One of: pending, associated, unmatched, responded, ignored.",
  received_at: "Unix timestamp (seconds) of when the email was received by the Worker.",
};

// ---------------------------------------------------------------------------
// Table definition
// ---------------------------------------------------------------------------

export const emails = sqliteTable(
  "emails",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    sender: text("sender").notNull(),
    rawContent: text("raw_content").notNull(),
    processedStatus: text("processed_status", {
      enum: ["pending", "associated", "unmatched", "responded", "ignored"],
    })
      .notNull()
      .default("pending"),
    receivedAt: integer("received_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    processedStatusIdx: index("emails_processed_status_idx").on(table.processedStatus),
  }),
);

export const insertEmailSchema = createInsertSchema(emails);
export const selectEmailSchema = createSelectSchema(emails);
export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;
