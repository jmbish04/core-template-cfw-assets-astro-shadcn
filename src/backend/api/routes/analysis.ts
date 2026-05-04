/**
 * @fileoverview Hireability analysis API routes — fetch, trigger, and
 * browse role analysis results stored in D1.
 *
 * Routes:
 *  GET  /api/roles/:roleId/analysis              — latest analysis + alignment scores
 *  GET  /api/roles/:roleId/analysis/history       — all analyses for a role (revision list)
 *  GET  /api/roles/:roleId/analysis/:analysisId   — specific analysis by ID
 *  POST /api/roles/:roleId/analysis               — trigger re-analysis
 *  GET  /api/roles/:roleId/analysis/alignment      — alignment scores grouped by type
 */

import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";

import type { AppBindings } from "..";

import { enqueueOrchestratorTask } from "../../ai/agents/orchestrator";
import { getDb } from "../../db";
import { roleAlignmentScores, roleAnalyses } from "../../db/schema";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const analysisRouter = new Hono<AppBindings>();

// ---------------------------------------------------------------------------
// Shared serializer — maps a role_analyses row to the API response shape
// ---------------------------------------------------------------------------

function serializeAnalysis(row: typeof roleAnalyses.$inferSelect) {
  return {
    id: row.id,
    roleId: row.roleId,
    version: row.version,
    hireScore: row.hireScore,
    hireRationale: row.hireRationale,
    compensationScore: row.compensationScore,
    compensationRationale: row.compensationRationale,
    configNotebooklmPrompt: row.configNotebooklmPrompt,
    configCompensationBaseline: row.configCompensationBaseline,
    configCareerStories: row.configCareerStories,
    usedDefaults: row.usedDefaults,
    analyzedAt: row.analyzedAt,
  };
}

/**
 * GET /:roleId/analysis — fetch the latest hireability analysis for a role.
 *
 * Returns the top-level scores (hire + compensation), config snapshot, and all alignment scores.
 * Returns 404 if no analysis has been performed yet.
 */
analysisRouter.get("/:roleId/analysis", async (c) => {
  const { roleId } = c.req.param();
  const db = getDb(c.env);

  const [analysis] = await db
    .select()
    .from(roleAnalyses)
    .where(eq(roleAnalyses.roleId, roleId))
    .orderBy(desc(roleAnalyses.analyzedAt))
    .limit(1);

  if (!analysis) {
    return c.json({ error: "No analysis found for this role" }, 404);
  }

  const alignmentScores = await db
    .select()
    .from(roleAlignmentScores)
    .where(eq(roleAlignmentScores.analysisId, analysis.id))
    .orderBy(desc(roleAlignmentScores.score));

  // Count total revisions for this role
  const allRevisions = await db
    .select({ id: roleAnalyses.id })
    .from(roleAnalyses)
    .where(eq(roleAnalyses.roleId, roleId));

  return c.json({
    analysis: serializeAnalysis(analysis),
    totalRevisions: allRevisions.length,
    alignmentScores: alignmentScores.map((s) => ({
      id: s.id,
      type: s.type,
      content: s.content,
      score: s.score,
      rationale: s.rationale,
    })),
  });
});

/**
 * GET /:roleId/analysis/history — all analyses for a role, ordered newest first.
 *
 * Returns summary data for each revision (no alignment scores — use /:analysisId for full data).
 */
analysisRouter.get("/:roleId/analysis/history", async (c) => {
  const { roleId } = c.req.param();
  const db = getDb(c.env);

  const analyses = await db
    .select()
    .from(roleAnalyses)
    .where(eq(roleAnalyses.roleId, roleId))
    .orderBy(desc(roleAnalyses.analyzedAt));

  return c.json({
    revisions: analyses.map(serializeAnalysis),
    total: analyses.length,
  });
});

/**
 * GET /:roleId/analysis/:analysisId — fetch a specific analysis by ID.
 *
 * Returns full analysis data including alignment scores and config snapshots.
 */
analysisRouter.get("/:roleId/analysis/:analysisId", async (c) => {
  const { roleId, analysisId } = c.req.param();
  const db = getDb(c.env);

  const [analysis] = await db
    .select()
    .from(roleAnalyses)
    .where(eq(roleAnalyses.id, analysisId))
    .limit(1);

  if (!analysis || analysis.roleId !== roleId) {
    return c.json({ error: "Analysis not found" }, 404);
  }

  const alignmentScores = await db
    .select()
    .from(roleAlignmentScores)
    .where(eq(roleAlignmentScores.analysisId, analysis.id))
    .orderBy(desc(roleAlignmentScores.score));

  const allRevisions = await db
    .select({ id: roleAnalyses.id })
    .from(roleAnalyses)
    .where(eq(roleAnalyses.roleId, roleId));

  return c.json({
    analysis: serializeAnalysis(analysis),
    totalRevisions: allRevisions.length,
    alignmentScores: alignmentScores.map((s) => ({
      id: s.id,
      type: s.type,
      content: s.content,
      score: s.score,
      rationale: s.rationale,
    })),
  });
});

/**
 * POST /:roleId/analysis — trigger a new hireability analysis.
 *
 * Enqueues a `role_analysis` task on the OrchestratorAgent Durable Object.
 * The analysis runs asynchronously and results are stored in D1.
 */
analysisRouter.post("/:roleId/analysis", async (c) => {
  const { roleId } = c.req.param();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const task: { id: string } = (await enqueueOrchestratorTask(c.env, roleId, {
    type: "role_analysis",
    roleId,
  })) as any;

  return c.json({ status: "queued", taskId: task.id }, 202);
});

/**
 * GET /:roleId/analysis/alignment — fetch alignment scores grouped by type.
 *
 * Groups scores into overlap tiers:
 *  - strong: 75–100
 *  - moderate: 40–74
 *  - gap: 0–39
 */
analysisRouter.get("/:roleId/analysis/alignment", async (c) => {
  const { roleId } = c.req.param();
  const db = getDb(c.env);

  const [analysis] = await db
    .select({ id: roleAnalyses.id })
    .from(roleAnalyses)
    .where(eq(roleAnalyses.roleId, roleId))
    .orderBy(desc(roleAnalyses.analyzedAt))
    .limit(1);

  if (!analysis) {
    return c.json({ error: "No analysis found for this role" }, 404);
  }

  const scores = await db
    .select()
    .from(roleAlignmentScores)
    .where(eq(roleAlignmentScores.analysisId, analysis.id))
    .orderBy(desc(roleAlignmentScores.score));

  // Group by type
  const grouped: Record<string, typeof scores> = {};
  for (const score of scores) {
    (grouped[score.type] ??= []).push(score);
  }

  // Within each type, sub-group by overlap tier
  const tiered = Object.entries(grouped).map(([type, items]) => ({
    type,
    strong: items.filter((s) => s.score >= 75),
    moderate: items.filter((s) => s.score >= 40 && s.score < 75),
    gap: items.filter((s) => s.score < 40),
  }));

  return c.json({ analysisId: analysis.id, groups: tiered });
});

// ---------------------------------------------------------------------------
// POST /:roleId/comments/respond — trigger automated comment responses
// ---------------------------------------------------------------------------

/**
 * POST /:roleId/comments/respond
 *
 * Enqueues a `resume_comment_response` task on the OrchestratorAgent.
 * The task processes all unresolved @colby / #colby tagged comments
 * on the specified Google Doc.
 *
 * Body: { gdocId: string }
 */
analysisRouter.post("/:roleId/comments/respond", async (c) => {
  const { roleId } = c.req.param();
  const body = await c.req.json<{ gdocId: string }>();

  if (!body.gdocId) {
    return c.json({ error: "Missing gdocId in request body" }, 400);
  }

  const task: { id: string } = (await enqueueOrchestratorTask(c.env, roleId, {
    type: "resume_comment_response",
    roleId,
    payload: { gdocId: body.gdocId },
  })) as any;

  return c.json({ status: "queued", taskId: task.id, roleId, gdocId: body.gdocId }, 202);
});
