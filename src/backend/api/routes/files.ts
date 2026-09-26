/**
 * @fileoverview Drive Explorer REST API — `/api/files`.
 *
 * Backs the `/files` page (ReUI block `solution-files-1`). The folder/file
 * tree lives in the `files` D1 table; the bytes live in the
 * `R2_FILES_BUCKET` R2 bucket under each row's `r2_key`.
 *
 * R2 has no foreign keys, so cascade deletes are done explicitly here: a
 * folder delete walks its descendants in D1, removes their R2 objects, then
 * deletes the rows. Doing it in that order means a crash mid-delete leaves
 * orphaned rows pointing at missing objects (visible, recoverable) rather
 * than orphaned objects nothing references (invisible, billed forever).
 *
 * Route inventory:
 *   GET    /                 – list one folder, or search the whole drive
 *   GET    /tree             – every folder, for the sidebar rail
 *   GET    /storage          – total bytes + entry counts for the meter
 *   GET    /{id}             – one entry with its ancestor path
 *   GET    /{id}/content     – download the bytes from R2
 *   POST   /folders          – create a folder
 *   POST   /upload           – multipart upload (field `file`, optional `parentId`)
 *   PATCH  /{id}             – rename / move / star
 *   DELETE /{id}             – delete an entry and everything under it
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, asc, eq, inArray, isNull, like, sql } from "drizzle-orm";

import { getDb } from "@/backend/db";
import { files, selectFileSchema } from "@/backend/db/schema";

const idParam = z.object({ id: z.string().min(1) });
const notFoundSchema = z.object({ error: z.string() });
const errorSchema = z.object({ error: z.string() });

const listQuery = z.object({
  /** Folder to list. Omit for the drive root. Ignored when `q` is set. */
  parentId: z.string().optional(),
  /** Full-drive name search. Returns matches from every folder. */
  q: z.string().optional(),
  /** `all` (default) or `starred`. */
  scope: z.enum(["all", "starred"]).optional(),
});

const listResponse = z.object({
  data: z.array(selectFileSchema),
  /** Root → current folder, for the breadcrumb. Empty at the root. */
  path: z.array(z.object({ id: z.string(), name: z.string() })),
});

const treeResponse = z.object({ data: z.array(selectFileSchema) });

const storageResponse = z.object({
  usedBytes: z.number(),
  fileCount: z.number(),
  folderCount: z.number(),
});

const createFolderBody = z
  .object({
    name: z.string().min(1).max(200),
    parentId: z.string().nullable().optional(),
  })
  .openapi("CreateFolderBody");

const patchFileBody = z
  .object({
    name: z.string().min(1).max(200).optional(),
    /** New parent folder id, or null to move to the root. */
    parentId: z.string().nullable().optional(),
    starred: z.boolean().optional(),
  })
  .openapi("PatchFileBody");

const deleteResponse = z.object({ ok: z.boolean(), deleted: z.number() });

export const filesRouter = new OpenAPIHono<{ Bindings: Env }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Walk `parent_id` up to the root. Returned root-first for the breadcrumb. */
async function ancestorPath(env: Env, startParentId: string | null) {
  const db = getDb(env);
  const path: Array<{ id: string; name: string }> = [];
  let cursor = startParentId;
  // A cycle would hang the request; the tree is only ever written through
  // this router, which rejects cycles, but bound the walk anyway.
  for (let depth = 0; cursor && depth < 64; depth += 1) {
    const [row] = await db
      .select({ id: files.id, name: files.name, parentId: files.parentId })
      .from(files)
      .where(eq(files.id, cursor))
      .limit(1);
    if (!row) break;
    path.unshift({ id: row.id, name: row.name });
    cursor = row.parentId;
  }
  return path;
}

/** Every descendant id of `rootId`, inclusive, breadth-first. */
async function collectSubtree(env: Env, rootId: string): Promise<string[]> {
  const db = getDb(env);
  const all = [rootId];
  let frontier = [rootId];
  for (let depth = 0; frontier.length > 0 && depth < 64; depth += 1) {
    const children = await db
      .select({ id: files.id })
      .from(files)
      .where(inArray(files.parentId, frontier));
    frontier = children.map((c) => c.id);
    all.push(...frontier);
  }
  return all;
}

/** True when moving `id` under `newParentId` would create a cycle. */
async function wouldCycle(env: Env, id: string, newParentId: string | null) {
  if (!newParentId) return false;
  if (newParentId === id) return true;
  const subtree = await collectSubtree(env, id);
  return subtree.includes(newParentId);
}

// ---------------------------------------------------------------------------
// GET / — list a folder, or search
// ---------------------------------------------------------------------------

filesRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Files"],
    summary: "List a folder's contents, or search the whole drive",
    operationId: "filesList",
    request: { query: listQuery },
    responses: {
      200: {
        description: "Folders first, then files, each alphabetical.",
        content: { "application/json": { schema: listResponse } },
      },
    },
  }),
  async (c) => {
    const { parentId, q, scope } = c.req.valid("query");
    const db = getDb(c.env);

    const filters = [];
    if (q) filters.push(like(files.name, `%${q}%`));
    else filters.push(parentId ? eq(files.parentId, parentId) : isNull(files.parentId));
    if (scope === "starred") filters.push(eq(files.starred, true));

    const rows = await db
      .select()
      .from(files)
      .where(and(...filters))
      // Folders before files, then alphabetical — the order the explorer expects.
      .orderBy(sql`case when ${files.kind} = 'folder' then 0 else 1 end`, asc(files.name));

    const path = q ? [] : await ancestorPath(c.env, parentId ?? null);
    return c.json({ data: rows, path }, 200);
  },
);

// ---------------------------------------------------------------------------
// GET /tree — folders only
// ---------------------------------------------------------------------------

filesRouter.openapi(
  createRoute({
    method: "get",
    path: "/tree",
    tags: ["Files"],
    summary: "Every folder, for the explorer's tree rail",
    operationId: "filesTree",
    responses: {
      200: {
        description: "All folder rows.",
        content: { "application/json": { schema: treeResponse } },
      },
    },
  }),
  async (c) => {
    const rows = await getDb(c.env)
      .select()
      .from(files)
      .where(eq(files.kind, "folder"))
      .orderBy(asc(files.name));
    return c.json({ data: rows }, 200);
  },
);

// ---------------------------------------------------------------------------
// GET /storage — usage meter
// ---------------------------------------------------------------------------

filesRouter.openapi(
  createRoute({
    method: "get",
    path: "/storage",
    tags: ["Files"],
    summary: "Total stored bytes and entry counts",
    operationId: "filesStorage",
    responses: {
      200: {
        description: "Usage summary.",
        content: { "application/json": { schema: storageResponse } },
      },
    },
  }),
  async (c) => {
    const [row] = await getDb(c.env)
      .select({
        usedBytes: sql<number>`coalesce(sum(${files.size}), 0)`,
        fileCount: sql<number>`sum(case when ${files.kind} = 'file' then 1 else 0 end)`,
        folderCount: sql<number>`sum(case when ${files.kind} = 'folder' then 1 else 0 end)`,
      })
      .from(files);
    return c.json(
      {
        usedBytes: Number(row?.usedBytes ?? 0),
        fileCount: Number(row?.fileCount ?? 0),
        folderCount: Number(row?.folderCount ?? 0),
      },
      200,
    );
  },
);

// ---------------------------------------------------------------------------
// POST /folders
// ---------------------------------------------------------------------------

filesRouter.openapi(
  createRoute({
    method: "post",
    path: "/folders",
    tags: ["Files"],
    summary: "Create a folder",
    operationId: "filesCreateFolder",
    request: { body: { content: { "application/json": { schema: createFolderBody } } } },
    responses: {
      201: {
        description: "The created folder.",
        content: { "application/json": { schema: selectFileSchema } },
      },
      404: {
        description: "Parent folder not found.",
        content: { "application/json": { schema: notFoundSchema } },
      },
    },
  }),
  async (c) => {
    const { name, parentId } = c.req.valid("json");
    const db = getDb(c.env);

    if (parentId) {
      const [parent] = await db
        .select({ id: files.id, kind: files.kind })
        .from(files)
        .where(eq(files.id, parentId))
        .limit(1);
      if (!parent || parent.kind !== "folder") {
        return c.json({ error: "Parent folder not found." }, 404);
      }
    }

    const [row] = await db
      .insert(files)
      .values({ kind: "folder", name, parentId: parentId ?? null })
      .returning();
    return c.json(row!, 201);
  },
);

// ---------------------------------------------------------------------------
// POST /upload — multipart
// ---------------------------------------------------------------------------
//
// Hand-registered: `multipart/form-data` with a binary part is not worth
// modelling through zod-openapi's JSON-first request helper.

filesRouter.openAPIRegistry.registerPath({
  method: "post",
  path: "/api/files/upload",
  tags: ["Files"],
  summary: "Upload a file into a folder",
  operationId: "filesUpload",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.string().openapi({ format: "binary" }),
            parentId: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "The created file row.",
      content: { "application/json": { schema: selectFileSchema } },
    },
    400: {
      description: "No file part in the request.",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

/** Hard ceiling per upload. R2 itself allows far more; this keeps a stray
 *  multi-GB drop from pinning the Worker's memory. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

filesRouter.post("/upload", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const part = form?.get("file");
  if (!form || !(part instanceof File)) {
    return c.json({ error: "Expected a multipart body with a `file` part." }, 400);
  }
  if (part.size > MAX_UPLOAD_BYTES) {
    return c.json({ error: `File is larger than the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.` }, 413);
  }

  const parentIdRaw = form.get("parentId");
  const parentId = typeof parentIdRaw === "string" && parentIdRaw ? parentIdRaw : null;

  const db = getDb(c.env);
  if (parentId) {
    const [parent] = await db
      .select({ id: files.id, kind: files.kind })
      .from(files)
      .where(eq(files.id, parentId))
      .limit(1);
    if (!parent || parent.kind !== "folder") {
      return c.json({ error: "Parent folder not found." }, 404);
    }
  }

  const id = crypto.randomUUID();
  const r2Key = `files/${id}`;
  await c.env.R2_FILES_BUCKET.put(r2Key, await part.arrayBuffer(), {
    httpMetadata: { contentType: part.type || "application/octet-stream" },
  });

  const [row] = await db
    .insert(files)
    .values({
      id,
      kind: "file",
      name: part.name || "untitled",
      mimeType: part.type || "application/octet-stream",
      size: part.size,
      r2Key,
      parentId,
    })
    .returning();

  return c.json(row!, 201);
});

// ---------------------------------------------------------------------------
// GET /{id}/content — download
// ---------------------------------------------------------------------------

filesRouter.openAPIRegistry.registerPath({
  method: "get",
  path: "/api/files/{id}/content",
  tags: ["Files"],
  summary: "Download a file's bytes",
  operationId: "filesDownload",
  request: { params: idParam },
  responses: {
    200: { description: "The file body.", content: { "application/octet-stream": { schema: z.string() } } },
    404: { description: "Not found.", content: { "application/json": { schema: notFoundSchema } } },
  },
});

filesRouter.get("/:id/content", async (c) => {
  const id = c.req.param("id");
  const [row] = await getDb(c.env).select().from(files).where(eq(files.id, id)).limit(1);
  if (!row || row.kind !== "file" || !row.r2Key) return c.json({ error: "File not found." }, 404);

  const object = await c.env.R2_FILES_BUCKET.get(row.r2Key);
  // The row exists but the object does not — say so rather than 404ing as if
  // the file was never uploaded; the two failures need different fixes.
  if (!object) return c.json({ error: "File body is missing from storage." }, 410);

  return new Response(object.body, {
    headers: {
      "content-type": row.mimeType ?? "application/octet-stream",
      "content-disposition": `attachment; filename="${encodeURIComponent(row.name)}"`,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /{id}
// ---------------------------------------------------------------------------

filesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Files"],
    summary: "Get one entry with its ancestor path",
    operationId: "filesGet",
    request: { params: idParam },
    responses: {
      200: {
        description: "The entry.",
        content: {
          "application/json": {
            schema: z.object({
              data: selectFileSchema,
              path: z.array(z.object({ id: z.string(), name: z.string() })),
            }),
          },
        },
      },
      404: { description: "Not found.", content: { "application/json": { schema: notFoundSchema } } },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const [row] = await getDb(c.env).select().from(files).where(eq(files.id, id)).limit(1);
    if (!row) return c.json({ error: "Entry not found." }, 404);
    return c.json({ data: row, path: await ancestorPath(c.env, row.parentId) }, 200);
  },
);

// ---------------------------------------------------------------------------
// PATCH /{id} — rename / move / star
// ---------------------------------------------------------------------------

filesRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    tags: ["Files"],
    summary: "Rename, move or star an entry",
    operationId: "filesPatch",
    request: {
      params: idParam,
      body: { content: { "application/json": { schema: patchFileBody } } },
    },
    responses: {
      200: { description: "The updated entry.", content: { "application/json": { schema: selectFileSchema } } },
      400: { description: "Invalid move.", content: { "application/json": { schema: errorSchema } } },
      404: { description: "Not found.", content: { "application/json": { schema: notFoundSchema } } },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = getDb(c.env);

    if (body.parentId !== undefined && (await wouldCycle(c.env, id, body.parentId))) {
      return c.json({ error: "A folder cannot be moved inside itself." }, 400);
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.parentId !== undefined) patch.parentId = body.parentId;
    if (body.starred !== undefined) patch.starred = body.starred;

    const [row] = await db.update(files).set(patch).where(eq(files.id, id)).returning();
    if (!row) return c.json({ error: "Entry not found." }, 404);
    return c.json(row, 200);
  },
);

// ---------------------------------------------------------------------------
// DELETE /{id}
// ---------------------------------------------------------------------------

filesRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Files"],
    summary: "Delete an entry and everything under it",
    operationId: "filesDelete",
    request: { params: idParam },
    responses: {
      200: { description: "How many rows were removed.", content: { "application/json": { schema: deleteResponse } } },
      404: { description: "Not found.", content: { "application/json": { schema: notFoundSchema } } },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = getDb(c.env);

    const [row] = await db.select({ id: files.id }).from(files).where(eq(files.id, id)).limit(1);
    if (!row) return c.json({ error: "Entry not found." }, 404);

    const ids = await collectSubtree(c.env, id);
    const objects = await db
      .select({ r2Key: files.r2Key })
      .from(files)
      .where(and(inArray(files.id, ids), eq(files.kind, "file")));

    const keys = objects.map((o) => o.r2Key).filter((k): k is string => Boolean(k));
    // R2 delete takes at most 1000 keys per call.
    for (let i = 0; i < keys.length; i += 1000) {
      await c.env.R2_FILES_BUCKET.delete(keys.slice(i, i + 1000));
    }

    await db.delete(files).where(inArray(files.id, ids));
    return c.json({ ok: true, deleted: ids.length }, 200);
  },
);
