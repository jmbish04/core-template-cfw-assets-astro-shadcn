import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";

import { getDb } from "../../db";
import { documents, insertDocumentSchema, selectDocumentSchema } from "../../db/schema";

const documentQuery = z.object({ roleId: z.string().optional() });
const documentParam = z.object({ id: z.string() });
const documentCreate = insertDocumentSchema.omit({ id: true });

export const documentsRouter = new OpenAPIHono<{ Bindings: Env }>();

documentsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "documentsList",
    request: { query: documentQuery },
    responses: {
      200: {
        description: "List documents",
        content: { "application/json": { schema: z.array(selectDocumentSchema) } },
      },
    },
  }),
  async (c) => {
    const { roleId } = c.req.valid("query");
    const db = getDb(c.env);
    const rows = roleId
      ? await db.select().from(documents).where(eq(documents.roleId, roleId))
      : await db.select().from(documents);

    return c.json(rows);
  },
);

documentsRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "documentsCreate",
    request: { body: { content: { "application/json": { schema: documentCreate } } } },
    responses: {
      201: {
        description: "Created document link",
        content: { "application/json": { schema: selectDocumentSchema } },
      },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    const [document] = await getDb(c.env)
      .insert(documents)
      .values({ ...body, id: crypto.randomUUID() })
      .returning();

    return c.json(document, 201);
  },
);

documentsRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    operationId: "documentsDelete",
    request: { params: documentParam },
    responses: {
      200: {
        description: "Deleted document",
        content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    await getDb(c.env).delete(documents).where(eq(documents.id, id));

    return c.json({ ok: true });
  },
);
