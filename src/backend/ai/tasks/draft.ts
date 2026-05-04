import { getModelRegistry } from "@/backend/ai/models";
import { getProvider } from "@/backend/ai/providers";

export type DraftDocType = "resume" | "cover_letter" | "email_reply";

/**
 * Draft polished job-application content (resume, cover letter, or email reply).
 *
 * Before drafting, queries the `resume_bullets` table for all active bullets
 * and injects them into the system prompt as "Historical Performance Truths"
 * so the LLM can map verified accomplishments to job requirements.
 */
export async function draft(
  env: Env,
  opts: {
    docType: DraftDocType;
    context: string | Record<string, unknown>;
    cacheTtl?: number;
  },
): Promise<string> {
  const provider = getProvider(env);
  const model = getModelRegistry(env).draft;
  const context =
    typeof opts.context === "string" ? opts.context : JSON.stringify(opts.context, null, 2);

  // Fetch active bullets and build the context block
  const bulletsBlock = ""; //await buildBulletsContext(env);

  const systemPrompt = [
    "You are Colby, a precise career assistant. Draft polished, truthful job-application content from the provided context.",
    "",
    bulletsBlock,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await provider.invokeModel(
    model,
    {
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Draft type: ${opts.docType}\n\nContext:\n${context}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 2400,
    },
    { cacheTtl: opts.cacheTtl },
  );

  return result.response;
}

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * Query all active resume bullets from D1 and format them as a structured
 * context block for the system prompt.
 *
 * Returns an empty string if no active bullets exist.
 */
async function buildBulletsContext(_env: Env): Promise<string> {
  // const bullets = await getActiveBullets(env);

  // if (bullets.length === 0) {
  //   return "";
  // }

  // const lines = bullets.map((b) => {
  //   const metric = b.impactMetric ? ` (${b.impactMetric})` : "";
  //   return `[${b.category}]${metric} ${b.content}`;
  // });

  return "## Historical Performance Truths";
}

/**
 * Fetch all active bullets from D1, ordered by category.
 * Used internally by the draft task — agents should use this
 * indirectly through the draft() function.
 */
// export async function getActiveBullets(env: Env): Promise<ResumeBullet[]> {
//   const db = getDb(env);

//   return db
//     .select()
//     .from(resumeBullets)
//     .where(eq(resumeBullets.isActive, true))
//     .orderBy(resumeBullets.category);
// }
