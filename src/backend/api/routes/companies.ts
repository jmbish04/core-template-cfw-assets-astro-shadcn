import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";

import { extractBrandColors } from "../../ai/tools/google/templates/brand-colors";
import { getDb } from "../../db";
import { companies, insertCompanySchema, selectCompanySchema } from "../../db/schema";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const companyIdParam = z.object({ id: z.string() });

const createCompanyBody = z.object({
  name: z.string().min(1),
  url: z.string().optional(),
  description: z.string().optional(),
  greenhouseToken: z.string().optional(),
  colorPrimary: z.string().optional(),
  colorAccent: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

const updateCompanyBody = z.object({
  name: z.string().min(1).optional(),
  url: z.string().optional(),
  description: z.string().optional(),
  greenhouseToken: z.string().optional(),
  colorPrimary: z.string().nullable().optional(),
  colorAccent: z.string().nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

const extractColorsBody = z.object({
  url: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const companiesRouter = new OpenAPIHono<{ Bindings: Env }>();

// GET / — List all companies
companiesRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "companiesList",
    responses: {
      200: {
        description: "List of all companies",
        content: { "application/json": { schema: z.array(selectCompanySchema) } },
      },
    },
  }),
  async (c) => {
    const rows = await getDb(c.env).select().from(companies);
    return c.json(rows);
  },
);

// GET /:id — Get single company
companiesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    operationId: "companiesGet",
    request: { params: companyIdParam },
    responses: {
      200: {
        description: "Single company",
        content: { "application/json": { schema: selectCompanySchema } },
      },
      404: { description: "Company not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const [row] = await getDb(c.env).select().from(companies).where(eq(companies.id, id)).limit(1);

    if (!row) return c.json({ error: "Company not found" }, 404);
    return c.json(row);
  },
);

// POST / — Create company
companiesRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "companiesCreate",
    request: {
      body: { content: { "application/json": { schema: createCompanyBody } } },
    },
    responses: {
      201: {
        description: "Created company",
        content: { "application/json": { schema: selectCompanySchema } },
      },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    const id = crypto.randomUUID();

    const [created] = await getDb(c.env)
      .insert(companies)
      .values({
        id,
        name: body.name,
        url: body.url,
        description: body.description,
        greenhouseToken: body.greenhouseToken,
        colorPrimary: body.colorPrimary,
        colorAccent: body.colorAccent,
        attributes: body.attributes,
      })
      .returning();

    return c.json(created, 201);
  },
);

// PUT /:id — Update company
companiesRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}",
    operationId: "companiesUpdate",
    request: {
      params: companyIdParam,
      body: { content: { "application/json": { schema: updateCompanyBody } } },
    },
    responses: {
      200: {
        description: "Updated company",
        content: { "application/json": { schema: selectCompanySchema } },
      },
      404: { description: "Company not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const [updated] = await getDb(c.env)
      .update(companies)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();

    if (!updated) return c.json({ error: "Company not found" }, 404);
    return c.json(updated);
  },
);

// DELETE /:id — Delete company
companiesRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    operationId: "companiesDelete",
    request: { params: companyIdParam },
    responses: {
      200: { description: "Company deleted" },
      404: { description: "Company not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await getDb(c.env).delete(companies).where(eq(companies.id, id)).returning();

    if (result.length === 0) return c.json({ error: "Company not found" }, 404);
    return c.json({ ok: true });
  },
);

// POST /extract-colors — Extract brand colors from URL (no DB write)
companiesRouter.openapi(
  createRoute({
    method: "post",
    path: "/extract-colors",
    operationId: "companiesExtractColors",
    request: {
      body: { content: { "application/json": { schema: extractColorsBody } } },
    },
    responses: {
      200: {
        description: "Extracted brand color palette",
        content: {
          "application/json": {
            schema: z.object({
              primary: z.string(),
              accent: z.string(),
              source: z.string(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { url } = c.req.valid("json");
    const palette = await extractBrandColors(c.env, url);
    return c.json(palette);
  },
);
