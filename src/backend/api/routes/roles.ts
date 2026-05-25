import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";

import { getDb } from "../../db";
import { insertRoleSchema, roles, selectRoleSchema } from "../../db/schema";

const roleListQuery = z.object({
  status: z.string().optional(),
  sort: z.enum(["companyName", "jobTitle", "status", "createdAt"]).optional(),
  q: z.string().optional(),
});

const roleIdParams = z.object({ id: z.string() });
const roleListSchema = z.array(selectRoleSchema);
const rolePatchSchema = insertRoleSchema.partial().omit({ id: true, updatedAt: true });

export const rolesRouter = new OpenAPIHono<{ Bindings: Env }>();

rolesRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "rolesList",
    request: { query: roleListQuery },
    responses: {
      200: {
        description: "List roles",
        content: { "application/json": { schema: roleListSchema } },
      },
    },
  }),
  async (c) => {
    const query = c.req.valid("query");
    const db = getDb(c.env);
    let rows = await db.select().from(roles);

    if (query.status) {
      rows = rows.filter((role) => role.status === query.status);
    }

    if (query.q) {
      const q = query.q.toLowerCase();
      rows = rows.filter(
        (role) =>
          role.companyName.toLowerCase().includes(q) || role.jobTitle.toLowerCase().includes(q),
      );
    }

    if (query.sort) {
      rows = rows.sort((a, b) => String(a[query.sort!]).localeCompare(String(b[query.sort!])));
    }

    return c.json(rows);
  },
);

rolesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    operationId: "rolesGet",
    request: { params: roleIdParams },
    responses: {
      200: {
        description: "Get role",
        content: { "application/json": { schema: selectRoleSchema } },
      },
      404: { description: "Role not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const [role] = await getDb(c.env).select().from(roles).where(eq(roles.id, id)).limit(1);

    return role ? c.json(role) : c.json({ error: "Role not found" }, 404);
  },
);

rolesRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "rolesCreate",
    request: {
      body: { content: { "application/json": { schema: insertRoleSchema.omit({ id: true }) } } },
    },
    responses: {
      201: {
        description: "Created role",
        content: { "application/json": { schema: selectRoleSchema } },
      },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    const [role] = await getDb(c.env)
      .insert(roles)
      .values({ ...body, id: crypto.randomUUID() })
      .returning();

    return c.json(role, 201);
  },
);

rolesRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    operationId: "rolesUpdate",
    request: {
      params: roleIdParams,
      body: { content: { "application/json": { schema: rolePatchSchema } } },
    },
    responses: {
      200: {
        description: "Updated role",
        content: { "application/json": { schema: selectRoleSchema } },
      },
      404: { description: "Role not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const [role] = await getDb(c.env)
      .update(roles)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();

    return role ? c.json(role) : c.json({ error: "Role not found" }, 404);
  },
);

rolesRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    operationId: "rolesDelete",
    request: { params: roleIdParams },
    responses: {
      200: {
        description: "Deleted role",
        content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    await getDb(c.env).delete(roles).where(eq(roles.id, id));

    return c.json({ ok: true });
  },
);
