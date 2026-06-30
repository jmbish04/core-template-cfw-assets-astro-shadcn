/**
 * @fileoverview Tasks REST API router.
 *
 * Full CRUD over the `tasks` D1 table with support for:
 *  - Filtered list (q, status, priority, projectId, assignee, label, sort)
 *  - Kanban board view grouped by status column
 *  - Partial PATCH (status, priority, progress, position, and more)
 *
 * Mount this router at `/api/tasks` in `api/index.ts`.
 *
 * Route inventory:
 *   GET    /        – list tasks (q, status, priority, projectId, assignee, label, sort, limit, offset)
 *   GET    /board   – tasks grouped into kanban columns {todo, in_progress, in_review, done}
 *   POST   /        – create task
 *   GET    /{id}    – get task by id
 *   PATCH  /{id}    – partial update
 *   DELETE /{id}    – hard delete
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";

import { getDb } from "../../db";
import { insertTaskSchema, selectTaskSchema, tasks } from "../../db/schema";

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const taskIdParam = z.object({ id: z.string().min(1) });
const notFoundSchema = z.object({ error: z.string() });

const TASK_STATUSES = ["todo", "in_progress", "in_review", "done"] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

/**
 * Split a multi-value filter param into a clean string[].
 *
 * Accepts both comma-separated values (`?status=todo,in_review`) and repeated
 * keys (`?status=todo&status=in_review`) — the query parser may hand us either
 * a single string or an array. Empty entries are dropped. Returning `[]` means
 * "no filter", keeping the endpoint backwards-compatible with single values.
 */
function multiParam(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return [];
  const parts = Array.isArray(raw) ? raw : [raw];
  return parts
    .flatMap((p) => p.split(","))
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Narrow an arbitrary string[] to the allowed enum members. */
function filterEnum<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const set = new Set<string>(allowed);
  return values.filter((v): v is T => set.has(v));
}

/**
 * Multi-value filter param schema. Each filter accepts a comma-separated list
 * or a repeated key; a single value still works (so existing callers passing
 * `?status=todo` keep functioning). OpenAPI documents it as a CSV string.
 */
const multiValueQuery = z
  .union([z.string(), z.array(z.string())])
  .optional();

const taskListQuerySchema = z.object({
  q: z.string().optional().openapi({ description: "Search on title and description." }),
  status: multiValueQuery.openapi({
    description:
      "Filter by workflow status. Multi-value: comma-separated or repeated " +
      "(e.g. `todo,in_review`). One of todo|in_progress|in_review|done.",
  }),
  priority: multiValueQuery.openapi({
    description:
      "Filter by priority. Multi-value: comma-separated or repeated " +
      "(e.g. `high,urgent`). One of low|medium|high|urgent.",
  }),
  projectId: multiValueQuery.openapi({
    description: "Filter to one or more projects (comma-separated or repeated).",
  }),
  assignee: multiValueQuery.openapi({
    description: "Filter by one or more assignee display names (comma-separated or repeated).",
  }),
  label: multiValueQuery.openapi({
    description:
      "Filter to tasks containing ANY of these labels (comma-separated or repeated).",
  }),
  sort: z
    .enum(["dueDate", "priority", "createdAt", "position"])
    .optional()
    .openapi({ description: "Sort field (default: createdAt desc)." }),
  limit: z.string().optional().openapi({ description: "Max rows (default 50)." }),
  offset: z.string().optional().openapi({ description: "Skip rows for pagination (default 0)." }),
});

/** Slim insert body — server generates id, createdAt, updatedAt. */
const createTaskBody = insertTaskSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ title: z.string().min(1) });

/** All fields optional for PATCH. */
const patchTaskBody = createTaskBody.partial();

const taskListResponse = z.object({
  data: z.array(selectTaskSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

// Board column names in display order
const BOARD_STATUSES = ["todo", "in_progress", "in_review", "done"] as const;

const boardColumnSchema = z.object({
  status: z.enum(BOARD_STATUSES),
  label: z.string(),
  tasks: z.array(selectTaskSchema),
});

const boardResponseSchema = z.object({
  columns: z.array(boardColumnSchema),
});

const COLUMN_LABELS: Record<(typeof BOARD_STATUSES)[number], string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const deleteResponseSchema = z.object({ ok: z.boolean() });

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const tasksRouter = new OpenAPIHono<{ Bindings: Env }>();

// ---------------------------------------------------------------------------
// GET /
// ---------------------------------------------------------------------------

tasksRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Tasks"],
    summary: "List tasks",
    operationId: "tasksList",
    request: { query: taskListQuerySchema },
    responses: {
      200: {
        description: "Paginated list of tasks.",
        content: { "application/json": { schema: taskListResponse } },
      },
    },
  }),
  async (c) => {
    const {
      q,
      status: statusRaw,
      priority: priorityRaw,
      projectId: projectIdRaw,
      assignee: assigneeRaw,
      label: labelRaw,
      sort,
      limit: lStr,
      offset: oStr,
    } = c.req.valid("query");
    const limit = Math.min(parseInt(lStr ?? "50", 10) || 50, 200);
    const offset = parseInt(oStr ?? "0", 10) || 0;
    const db = getDb(c.env);

    // Normalize every faceted filter into a (possibly empty) string[].
    const statuses = filterEnum(multiParam(statusRaw), TASK_STATUSES);
    const priorities = filterEnum(multiParam(priorityRaw), TASK_PRIORITIES);
    const projectIds = multiParam(projectIdRaw);
    const assignees = multiParam(assigneeRaw);
    const labels = multiParam(labelRaw);

    const conditions = [];
    if (q) {
      conditions.push(or(like(tasks.title, `%${q}%`), like(tasks.description, `%${q}%`)));
    }
    if (statuses.length > 0) conditions.push(inArray(tasks.status, statuses));
    if (priorities.length > 0) conditions.push(inArray(tasks.priority, priorities));
    if (projectIds.length > 0) conditions.push(inArray(tasks.projectId, projectIds));
    if (assignees.length > 0) conditions.push(inArray(tasks.assignee, assignees));
    // Labels are stored as a JSON array — match tasks containing ANY label via OR of LIKEs.
    if (labels.length > 0) {
      const labelCol = tasks.labels as unknown as Parameters<typeof like>[0];
      conditions.push(or(...labels.map((l) => like(labelCol, `%"${l}"%`))));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const priorityOrder = sql`CASE ${tasks.priority}
      WHEN 'urgent' THEN 0
      WHEN 'high'   THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low'    THEN 3
      ELSE 4 END`;

    const sortExpr =
      sort === "dueDate"
        ? asc(tasks.dueDate)
        : sort === "priority"
          ? asc(priorityOrder)
          : sort === "position"
            ? asc(tasks.position)
            : desc(tasks.createdAt);

    const [rows, countResult] = await Promise.all([
      db.select().from(tasks).where(where).orderBy(sortExpr).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(tasks).where(where),
    ]);

    return c.json({ data: rows, total: countResult[0]?.count ?? 0, limit, offset }, 200);
  },
);

// ---------------------------------------------------------------------------
// GET /board
// ---------------------------------------------------------------------------

tasksRouter.openapi(
  createRoute({
    method: "get",
    path: "/board",
    tags: ["Tasks"],
    summary: "Kanban board — tasks grouped by status column",
    operationId: "tasksBoard",
    responses: {
      200: {
        description: "All tasks grouped into kanban columns ordered by position.",
        content: { "application/json": { schema: boardResponseSchema } },
      },
    },
  }),
  async (c) => {
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(tasks)
      .orderBy(asc(tasks.status), asc(tasks.position), asc(tasks.createdAt));

    // Group into columns
    const grouped = new Map<string, typeof rows>(BOARD_STATUSES.map((s) => [s, []]));
    for (const task of rows) {
      grouped.get(task.status)?.push(task);
    }

    const columns = BOARD_STATUSES.map((status) => ({
      status,
      label: COLUMN_LABELS[status],
      tasks: grouped.get(status) ?? [],
    }));

    return c.json({ columns }, 200);
  },
);

// ---------------------------------------------------------------------------
// POST /
// ---------------------------------------------------------------------------

tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Tasks"],
    summary: "Create task",
    operationId: "tasksCreate",
    request: {
      body: { content: { "application/json": { schema: createTaskBody } } },
    },
    responses: {
      201: {
        description: "Created task.",
        content: { "application/json": { schema: selectTaskSchema } },
      },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    const db = getDb(c.env);
    const [row] = await db
      .insert(tasks)
      .values({ ...body, createdAt: new Date(), updatedAt: new Date() })
      .returning();
    return c.json(row!, 201);
  },
);

// ---------------------------------------------------------------------------
// GET /{id}
// ---------------------------------------------------------------------------

tasksRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Tasks"],
    summary: "Get task by ID",
    operationId: "tasksGet",
    request: { params: taskIdParam },
    responses: {
      200: {
        description: "Task record.",
        content: { "application/json": { schema: selectTaskSchema } },
      },
      404: {
        description: "Not found.",
        content: { "application/json": { schema: notFoundSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = getDb(c.env);
    const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!row) {
      return c.json({ error: "Task not found." }, 404);
    }
    return c.json(row, 200);
  },
);

// ---------------------------------------------------------------------------
// PATCH /{id}
// ---------------------------------------------------------------------------

tasksRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    tags: ["Tasks"],
    summary: "Partial update task (status, priority, progress, position, etc.)",
    operationId: "tasksPatch",
    request: {
      params: taskIdParam,
      body: { content: { "application/json": { schema: patchTaskBody } } },
    },
    responses: {
      200: {
        description: "Updated task.",
        content: { "application/json": { schema: selectTaskSchema } },
      },
      404: {
        description: "Not found.",
        content: { "application/json": { schema: notFoundSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = getDb(c.env);
    const [row] = await db
      .update(tasks)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    if (!row) {
      return c.json({ error: "Task not found." }, 404);
    }
    return c.json(row, 200);
  },
);

// ---------------------------------------------------------------------------
// DELETE /{id}
// ---------------------------------------------------------------------------

tasksRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Tasks"],
    summary: "Delete task",
    operationId: "tasksDelete",
    request: { params: taskIdParam },
    responses: {
      200: {
        description: "Deletion confirmation.",
        content: { "application/json": { schema: deleteResponseSchema } },
      },
      404: {
        description: "Not found.",
        content: { "application/json": { schema: notFoundSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = getDb(c.env);
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });
    if (result.length === 0) {
      return c.json({ error: "Task not found." }, 404);
    }
    return c.json({ ok: true }, 200);
  },
);
