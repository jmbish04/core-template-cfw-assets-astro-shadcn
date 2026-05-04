import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";

import { getDb } from "../../db";
import { emails, selectEmailSchema } from "../../db/schema";

const emailQuery = z.object({
  processedStatus: z.string().optional(),
  roleId: z.string().optional(),
});
const emailParam = z.object({ id: z.string() });
const associateBody = z.object({ roleId: z.string() });

export const emailsRouter = new OpenAPIHono<{ Bindings: Env }>();

emailsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "emailsList",
    request: { query: emailQuery },
    responses: {
      200: {
        description: "List emails",
        content: { "application/json": { schema: z.array(selectEmailSchema) } },
      },
    },
  }),
  async (c) => {
    const query = c.req.valid("query");
    let rows = await getDb(c.env).select().from(emails);

    if (query.processedStatus) {
      rows = rows.filter((email) => email.processedStatus === query.processedStatus);
    }

    if (query.roleId) {
      rows = rows.filter((email) => email.roleId === query.roleId);
    }

    return c.json(rows);
  },
);

emailsRouter.openapi(
  createRoute({
    method: "get",
    path: "/unmatched",
    operationId: "emailsUnmatched",
    responses: {
      200: {
        description: "Unmatched emails",
        content: { "application/json": { schema: z.array(selectEmailSchema) } },
      },
    },
  }),
  async (c) => {
    const rows = await getDb(c.env)
      .select()
      .from(emails)
      .where(eq(emails.processedStatus, "unmatched"));

    return c.json(rows);
  },
);

emailsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    operationId: "emailsGet",
    request: { params: emailParam },
    responses: {
      200: {
        description: "Get email",
        content: { "application/json": { schema: selectEmailSchema } },
      },
      404: { description: "Email not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const [email] = await getDb(c.env).select().from(emails).where(eq(emails.id, id)).limit(1);

    return email ? c.json(email) : c.json({ error: "Email not found" }, 404);
  },
);

emailsRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/associate",
    operationId: "emailsAssociate",
    request: {
      params: emailParam,
      body: { content: { "application/json": { schema: associateBody } } },
    },
    responses: {
      200: {
        description: "Associated email",
        content: { "application/json": { schema: selectEmailSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { roleId } = c.req.valid("json");
    const [email] = await getDb(c.env)
      .update(emails)
      .set({ roleId, processedStatus: "associated" })
      .where(eq(emails.id, id))
      .returning();

    return c.json(email);
  },
);
