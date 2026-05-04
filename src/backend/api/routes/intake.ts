import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";

import { enqueueOrchestratorTask } from "../../ai/agents/orchestrator";
import { JobPosting } from "../../ai/agents/orchestrator/types";
import { extract } from "../../ai/tasks/extract";
import { scrapeUrl, capturePdf, extractMarkdown, extractJson, type ScrapedPage } from "../../ai/tools/browser-rendering";
import { GoogleDocsClient } from "../../ai/tools/google/docs";
import { parseGreenhouseUrl, scrapeGreenhouseJob } from "../../ai/tools/greenhouse";
import { buildRoleMarkdown } from "../../ai/tools/role-markdown";
import { getDb } from "../../db";
import {
  jobFailures,
  rolePodcasts,
  roleBullets as roleBulletsTable,
  ROLE_BULLET_TYPES,
  roles,
  selectRoleSchema,
  threads,
} from "../../db/schema";

const scrapeBody = z.object({ url: z.string().url() });
const sseResponseSchema = z.object({ stage: z.string(), payload: z.unknown().optional() });

/** JSON schema sent to the Browser Rendering /json endpoint. */
const BR_JSON_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "job_posting",
    properties: {
      companyName: "string",
      jobTitle: "string",
      location: "string",
      workplaceType: "string",
      salaryMin: "number",
      salaryMax: "number",
      salaryCurrency: "string",
      department: "string",
      responsibilities: "array",
      requiredQualifications: "array",
      preferredQualifications: "array",
      requiredSkills: "array",
      preferredSkills: "array",
      educationRequirements: "array",
      benefits: "array",
      yearsExperienceMin: "number",
      yearsExperienceMax: "number",
      rtoPolicy: "string",
      travelRequirements: "string",
      securityClearance: "string",
      visaSponsorship: "string",
      reportingTo: "string",
    },
  },
};

const BR_JSON_PROMPT = [
  "Extract ALL job posting details comprehensively:",
  "company name, job title, location, workplace type (remote/hybrid/onsite),",
  "salary range and currency, department, reporting manager,",
  "responsibilities, required qualifications, preferred qualifications,",
  "required skills, preferred skills, education requirements,",
  "years of experience (min/max), RTO/schedule policy,",
  "travel requirements, security clearance, visa sponsorship, benefits.",
  "Extract every detail available — leave fields empty only if not present.",
].join(" ");

// ---------------------------------------------------------------------------
// Scrape result (extends base with PDF + source tracking)
// ---------------------------------------------------------------------------

type ScrapeResult = {
  posting: z.infer<typeof JobPosting>;
  pdfUrl?: string;
  markdown?: string;
  html?: string;
  source: string;
};

// ---------------------------------------------------------------------------
// Scrape helper — concurrent BR methods → Greenhouse API fallback
// ---------------------------------------------------------------------------

/**
 * Multi-method scrape pipeline:
 *  1. Fire BR /pdf, /markdown, /json concurrently
 *  2. PDF → upload to R2 for user reference
 *  3. Markdown → feed to AI extractor for comprehensive field extraction
 *  4. JSON → structured extraction as primary data source
 *  5. Merge results: JSON fields > AI-from-markdown > defaults
 *  6. If ALL BR methods fail for a Greenhouse URL → Greenhouse API fallback
 */
async function scrapeWithFallback(
  env: Env,
  url: string,
  onStage?: (stage: string, payload?: unknown) => void,
): Promise<ScrapeResult> {
  const ghParsed = parseGreenhouseUrl(url);

  // ── Multi-method Browser Rendering ──────────────────────────────────────
  onStage?.("scraping", { source: "browser-rendering", methods: ["pdf", "markdown", "json"] });

  const [pdfResult, mdResult, jsonResult, snapshotResult] = await Promise.allSettled([
    capturePdf(env, url),
    extractMarkdown(env, url),
    extractJson(env, url, { prompt: BR_JSON_PROMPT, responseFormat: BR_JSON_SCHEMA }),
    scrapeUrl(env, url),
  ]);

  // Track which methods succeeded
  const pdfOk = pdfResult.status === "fulfilled";
  const mdOk = mdResult.status === "fulfilled" && (mdResult.value as string).length > 100;
  const jsonOk = jsonResult.status === "fulfilled";
  const snapshotOk =
    snapshotResult.status === "fulfilled" && (snapshotResult.value as ScrapedPage).html.length > 0;

  const anyBrSucceeded = pdfOk || mdOk || jsonOk || snapshotOk;

  if (!anyBrSucceeded) {
    console.error("All Browser Rendering methods failed:", {
      pdf: pdfResult.status === "rejected" ? (pdfResult.reason as Error).message : "ok",
      markdown: mdResult.status === "rejected" ? (mdResult.reason as Error).message : "ok",
      json: jsonResult.status === "rejected" ? (jsonResult.reason as Error).message : "ok",
      snapshot:
        snapshotResult.status === "rejected" ? (snapshotResult.reason as Error).message : "ok",
    });
  }

  // ── Greenhouse API fallback ─────────────────────────────────────────────
  if (!anyBrSucceeded && ghParsed) {
    onStage?.("scraping", { source: "greenhouse-api-fallback" });
    try {
      const ghResult = await scrapeGreenhouseJob(ghParsed.boardToken, ghParsed.jobId);
      const gh = ghResult.greenhouse;

      const salaryMatch = ghResult.text.match(/\$\s?([\d,]+)\s*(?:—|–|-|to)\s*\$\s?([\d,]+)/);

      return {
        posting: {
          companyName: gh.company_name ?? ghParsed.boardToken,
          jobTitle: gh.title,
          jobUrl: gh.absolute_url,
          salaryMin: salaryMatch ? parseInt(salaryMatch[1].replace(/,/g, ""), 10) : undefined,
          salaryMax: salaryMatch ? parseInt(salaryMatch[2].replace(/,/g, ""), 10) : undefined,
          salaryCurrency: salaryMatch ? "USD" : "USD",
          metadata: {
            location: gh.location?.name,
            departments: gh.departments?.map((d) => d.name),
            offices: gh.offices?.map((o) => o.name),
            source: "greenhouse-api",
            greenhouseJobId: gh.id,
          },
        },
        markdown: ghResult.text,
        html: ghResult.html,
        source: "greenhouse-api",
      };
    } catch (ghError) {
      throw new Error(
        `All scraping methods failed for ${url}. ` +
          `BR: ${pdfResult.status === "rejected" ? (pdfResult.reason as Error).message : "n/a"}. ` +
          `GH: ${ghError instanceof Error ? ghError.message : String(ghError)}`,
      );
    }
  }

  if (!anyBrSucceeded) {
    throw new Error(
      `All Browser Rendering methods failed for ${url}: ` +
        [
          pdfResult.status === "rejected" ? `pdf: ${(pdfResult.reason as Error).message}` : null,
          mdResult.status === "rejected" ? `md: ${(mdResult.reason as Error).message}` : null,
          jsonResult.status === "rejected" ? `json: ${(jsonResult.reason as Error).message}` : null,
          snapshotResult.status === "rejected"
            ? `snapshot: ${(snapshotResult.reason as Error).message}`
            : null,
        ]
          .filter(Boolean)
          .join("; "),
    );
  }

  // ── Upload PDF to R2 ───────────────────────────────────────────────────
  let pdfUrl: string | undefined;
  if (pdfOk) {
    onStage?.("uploading_pdf");
    try {
      const key = `job-postings/${crypto.randomUUID()}.pdf`;
      pdfUrl = await browser.uploadPdfToR2(key, pdfResult.value as ArrayBuffer, {
        sourceUrl: url,
        capturedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("PDF R2 upload failed (non-fatal):", err);
    }
  }

  // ── Extract from markdown via AI ────────────────────────────────────────
  let mdPosting: Partial<z.infer<typeof JobPosting>> = {};
  const markdownContent = mdOk ? (mdResult.value as string) : undefined;

  if (markdownContent) {
    onStage?.("extracting", { source: "markdown-ai" });
    try {
      mdPosting = await extract(env, { text: markdownContent, schema: JobPosting });
    } catch (err) {
      console.error("AI extraction from markdown failed (non-fatal):", err);
    }
  }

  // ── Extract from /json ──────────────────────────────────────────────────
  const jsonData = jsonOk ? (jsonResult.value as Record<string, unknown>) : {};

  // ── Merge results: JSON > AI-from-markdown > defaults ───────────────────
  const posting: z.infer<typeof JobPosting> = {
    companyName: asString(jsonData.companyName) || mdPosting.companyName || "Unknown Company",
    jobTitle: asString(jsonData.jobTitle) || mdPosting.jobTitle || "Unknown Title",
    jobUrl: asString(jsonData.jobUrl) || mdPosting.jobUrl || url,
    salaryMin: asNumber(jsonData.salaryMin) ?? mdPosting.salaryMin,
    salaryMax: asNumber(jsonData.salaryMax) ?? mdPosting.salaryMax,
    salaryCurrency: asString(jsonData.salaryCurrency) || mdPosting.salaryCurrency || "USD",

    // ── New comprehensive fields ──────────────────────────────────────────
    responsibilities: asStringArray(jsonData.responsibilities) ?? mdPosting.responsibilities,
    requiredQualifications:
      asStringArray(jsonData.requiredQualifications) ?? mdPosting.requiredQualifications,
    preferredQualifications:
      asStringArray(jsonData.preferredQualifications) ?? mdPosting.preferredQualifications,
    requiredSkills: asStringArray(jsonData.requiredSkills) ?? mdPosting.requiredSkills,
    preferredSkills: asStringArray(jsonData.preferredSkills) ?? mdPosting.preferredSkills,
    location: asString(jsonData.location) || mdPosting.location,
    workplaceType: asWorkplaceType(jsonData.workplaceType) ?? mdPosting.workplaceType,
    rtoPolicy: asString(jsonData.rtoPolicy) || mdPosting.rtoPolicy,
    yearsExperienceMin: asNumber(jsonData.yearsExperienceMin) ?? mdPosting.yearsExperienceMin,
    yearsExperienceMax: asNumber(jsonData.yearsExperienceMax) ?? mdPosting.yearsExperienceMax,
    educationRequirements:
      asStringArray(jsonData.educationRequirements) ?? mdPosting.educationRequirements,
    department: asString(jsonData.department) || mdPosting.department,
    reportingTo: asString(jsonData.reportingTo) || mdPosting.reportingTo,
    travelRequirements: asString(jsonData.travelRequirements) || mdPosting.travelRequirements,
    securityClearance: asString(jsonData.securityClearance) || mdPosting.securityClearance,
    visaSponsorship: asString(jsonData.visaSponsorship) || mdPosting.visaSponsorship,
    benefits: asStringArray(jsonData.benefits) ?? mdPosting.benefits,
    additionalNotes: mdPosting.additionalNotes,

    metadata: {
      ...mdPosting.metadata,
      brMethods: {
        pdf: pdfOk ? "ok" : "fail",
        markdown: mdOk ? "ok" : "fail",
        json: jsonOk ? "ok" : "fail",
        snapshot: snapshotOk ? "ok" : "fail",
      },
      source: "browser-rendering",
    },
  };

  return {
    posting,
    pdfUrl,
    markdown: markdownContent,
    html: snapshotOk ? (snapshotResult.value as ScrapedPage).html : undefined,
    source: "browser-rendering",
  };
}

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v.replace(/[,$]/g, ""), 10);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v) && v.length > 0) {
    return v.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return undefined;
}

const WORKPLACE_TYPES = new Set(["remote", "hybrid", "onsite"]);
function asWorkplaceType(v: unknown): "remote" | "hybrid" | "onsite" | undefined {
  const s = asString(v)?.toLowerCase();
  return s && WORKPLACE_TYPES.has(s) ? (s as "remote" | "hybrid" | "onsite") : undefined;
}

/**
 * Insert a podcast workflow row and start the durable background pipeline.
 *
 * Intake must never fail solely because Drive/NotebookLM/podcast background
 * processing cannot start. Errors are recorded on the `role_podcasts` row and
 * the newly-created role is still returned to the user.
 */
async function startRoleAssetsWorkflow(
  env: Env,
  role: typeof roles.$inferSelect,
  scrapedMarkdown?: string,
  scrapedHtml?: string,
): Promise<void> {
  const db = getDb(env);
  const podcastId = crypto.randomUUID();
  const notebooklmSourceFilename = `role-${role.id}.md`;
  const manualMarkdown = scrapedMarkdown?.trim()
    ? undefined
    : buildRoleMarkdown({
        companyName: role.companyName,
        jobTitle: role.jobTitle,
        jobUrl: role.jobUrl,
        salaryMin: role.salaryMin,
        salaryMax: role.salaryMax,
        salaryCurrency: role.salaryCurrency,
        roleInstructions: role.roleInstructions,
        metadata: role.metadata,
      });

  await db.insert(rolePodcasts).values({
    id: podcastId,
    roleId: role.id,
    notebooklmSourceFilename,
    status: "queued",
  });

  try {
    const instance = await env.ROLE_ASSETS_WORKFLOW.create({
      id: podcastId,
      params: {
        roleId: role.id,
        podcastId,
        scrapedMarkdown,
        scrapedHtml,
        manualMarkdown,
      },
    });
    await db
      .update(rolePodcasts)
      .set({ workflowInstanceId: instance.id, updatedAt: new Date() })
      .where(eq(rolePodcasts.id, podcastId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(rolePodcasts)
      .set({
        status: "failed",
        stepErrors: [{ step: "workflow_create", message, at: new Date().toISOString() }],
        updatedAt: new Date(),
      })
      .where(eq(rolePodcasts.id, podcastId));
    console.error("Failed to start role assets workflow (non-fatal):", error);
  }
}

const confirmBody = z.object({
  companyName: z.string(),
  jobTitle: z.string(),
  jobUrl: z.string().url().optional(),
  jobPostingPdfUrl: z.string().optional(),
  scrapedMarkdown: z.string().optional(),
  scrapedHtml: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  roleInstructions: z.string().optional(),
  // Comprehensive extracted fields
  responsibilities: z.array(z.string()).optional(),
  requiredQualifications: z.array(z.string()).optional(),
  preferredQualifications: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),
  location: z.string().optional(),
  workplaceType: z.enum(["remote", "hybrid", "onsite"]).optional(),
  rtoPolicy: z.string().optional(),
  yearsExperienceMin: z.number().optional(),
  yearsExperienceMax: z.number().optional(),
  educationRequirements: z.array(z.string()).optional(),
  department: z.string().optional(),
  reportingTo: z.string().optional(),
  travelRequirements: z.string().optional(),
  securityClearance: z.string().optional(),
  visaSponsorship: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  additionalNotes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Structured bullet items from the intake section tables
  roleBullets: z
    .array(
      z.object({
        type: z.enum(ROLE_BULLET_TYPES),
        content: z.string().min(1),
      }),
    )
    .optional(),
});

const batchBodySchema = z.object({
  jobs: z.array(
    z.object({
      jobUrl: z.string().url(),
      companyName: z.string().optional(),
      jobTitle: z.string().optional(),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
      salaryCurrency: z.string().optional(),
      roleInstructions: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

const batchResponseSchema = z.object({
  succeeded: z.array(selectRoleSchema),
  failed: z.array(
    z.object({
      jobUrl: z.string(),
      errorMessage: z.string(),
    }),
  ),
});

export const intakeRouter = new OpenAPIHono<{ Bindings: Env }>();

intakeRouter.openapi(
  createRoute({
    method: "post",
    path: "/scrape",
    operationId: "intakeScrape",
    request: { body: { content: { "application/json": { schema: scrapeBody } } } },
    responses: {
      200: {
        description: "SSE scrape progress",
        content: { "text/event-stream": { schema: sseResponseSchema } },
      },
    },
  }),
  (async (c: any) => {
    const { url } = c.req.valid("json");
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (stage: string, payload?: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ stage, payload })}\n\n`));
        };

        try {
          const { posting, pdfUrl, markdown, html } = await scrapeWithFallback(c.env, url, send);
          send("mapping", {
            ...posting,
            jobUrl: posting.jobUrl ?? url,
            jobPostingPdfUrl: pdfUrl,
            scrapedMarkdown: markdown,
            scrapedHtml: html,
          });
          controller.close();
        } catch (error) {
          send("error", {
            message: error instanceof Error ? error.message : "Unknown intake error",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
    });
  }) as any,
);

intakeRouter.openapi(
  createRoute({
    method: "post",
    path: "/confirm",
    operationId: "intakeConfirm",
    request: { body: { content: { "application/json": { schema: confirmBody } } } },
    responses: {
      201: {
        description: "Confirmed role",
        content: { "application/json": { schema: selectRoleSchema } },
      },
    },
  }),
  (async (c: any) => {
    const body = c.req.valid("json");
    const db = getDb(c.env);
    const folder = await new GoogleDocsClient(c.env).createFolder(
      `${body.companyName} - ${body.jobTitle}`,
      c.env.PARENT_DRIVE_FOLDER_ID,
    );

    // Separate transient/extracted fields from core role columns
    const {
      scrapedMarkdown,
      scrapedHtml,
      responsibilities,
      requiredQualifications,
      preferredQualifications,
      requiredSkills,
      preferredSkills,
      location,
      workplaceType,
      rtoPolicy,
      yearsExperienceMin,
      yearsExperienceMax,
      educationRequirements,
      department,
      reportingTo,
      travelRequirements,
      securityClearance,
      visaSponsorship,
      benefits,
      additionalNotes,
      metadata: incomingMeta,
      roleBullets: incomingBullets,
      ...coreValues
    } = body;

    // Pack extracted fields into metadata JSON
    const metadata = {
      ...incomingMeta,
      responsibilities,
      requiredQualifications,
      preferredQualifications,
      requiredSkills,
      preferredSkills,
      location,
      workplaceType,
      rtoPolicy,
      yearsExperienceMin,
      yearsExperienceMax,
      educationRequirements,
      department,
      reportingTo,
      travelRequirements,
      securityClearance,
      visaSponsorship,
      benefits,
      additionalNotes,
    };

    const [role] = await db
      .insert(roles)
      .values({ ...coreValues, metadata, id: crypto.randomUUID(), driveFolderId: folder.id })
      .returning();
    await db.insert(threads).values({
      id: crypto.randomUUID(),
      title: `${role.companyName} ${role.jobTitle}`,
      roleId: role.id,
    });
    await enqueueOrchestratorTask(c.env, role.id, {
      type: "job_extract",
      roleId: role.id,
      payload: {
        url: role.jobUrl ?? body.jobUrl,
        markdown: scrapedMarkdown,
      },
    });

    await startRoleAssetsWorkflow(c.env, role, scrapedMarkdown, scrapedHtml);

    // Insert role bullets if provided
    if (incomingBullets && incomingBullets.length > 0) {
      const typeCounters: Record<string, number> = {};
      const bulletRows = incomingBullets
        .filter((b: { type: string; content: string }) => b.content?.trim())
        .map((b: { type: string; content: string }) => {
          typeCounters[b.type] = (typeCounters[b.type] ?? 0) + 1;
          return {
            roleId: role.id,
            type: b.type as (typeof ROLE_BULLET_TYPES)[number],
            content: b.content.trim(),
            sortOrder: typeCounters[b.type] - 1,
          };
        });

      if (bulletRows.length > 0) {
        await db.insert(roleBulletsTable).values(bulletRows);
      }
    }

    return c.json(role, 201);
  }) as any,
);

intakeRouter.openapi(
  createRoute({
    method: "post",
    path: "/batch",
    operationId: "intakeBatch",
    request: { body: { content: { "application/json": { schema: batchBodySchema } } } },
    responses: {
      200: {
        description: "Batch result",
        content: { "application/json": { schema: batchResponseSchema } },
      },
    },
  }),
  (async (c: any) => {
    const { jobs } = c.req.valid("json");
    const db = getDb(c.env);

    const succeeded: any[] = [];
    const failed: any[] = [];

    for (const job of jobs) {
      try {
        const { posting, pdfUrl, markdown, html } = await scrapeWithFallback(c.env, job.jobUrl);

        const companyName = posting.companyName || job.companyName || "Unknown Company";
        const jobTitle = posting.jobTitle || job.jobTitle || "Unknown Title";

        const folder = await new GoogleDocsClient(c.env).createFolder(
          `${companyName} - ${jobTitle}`,
          c.env.PARENT_DRIVE_FOLDER_ID,
        );

        const [role] = await db
          .insert(roles)
          .values({
            id: crypto.randomUUID(),
            companyName,
            jobTitle,
            jobUrl: job.jobUrl,
            salaryMin: posting.salaryMin ?? job.salaryMin,
            salaryMax: posting.salaryMax ?? job.salaryMax,
            salaryCurrency: posting.salaryCurrency ?? job.salaryCurrency,
            roleInstructions: posting.roleInstructions ?? job.roleInstructions,
            metadata: { ...job.metadata, ...posting.metadata },
            jobPostingPdfUrl: pdfUrl,
            driveFolderId: folder.id,
          })
          .returning();

        await db.insert(threads).values({
          id: crypto.randomUUID(),
          title: `${companyName} ${jobTitle}`,
          roleId: role.id,
        });

        await enqueueOrchestratorTask(c.env, role.id, {
          type: "job_extract",
          roleId: role.id,
          payload: {
            url: role.jobUrl,
            markdown,
          },
        });

        await startRoleAssetsWorkflow(c.env, role, markdown, html);

        succeeded.push(role);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await db.insert(jobFailures).values({
          id: crypto.randomUUID(),
          jobUrl: job.jobUrl,
          errorMessage,
        });
        failed.push({ jobUrl: job.jobUrl, errorMessage });
      }
    }

    return c.json({ succeeded, failed });
  }) as any,
);
