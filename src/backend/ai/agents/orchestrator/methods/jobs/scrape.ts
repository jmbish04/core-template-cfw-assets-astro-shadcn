import { extract } from "@/ai/tasks/extract";
import {
  capturePdf,
  extractMarkdown,
  uploadPdfToR2,
  type ScrapedPage,
} from "@/ai/tools/browser-rendering";
import { parseGreenhouseUrl, scrapeGreenhouseJob } from "@/ai/tools/greenhouse";
import { JobPosting } from "@/backend/ai/agents/orchestrator/types";

/**
 * Scrapes a job URL using BR /markdown (for AI extraction content) and
 * BR /pdf (for user-facing archival). Falls back to Greenhouse API
 * when BR methods fail for Greenhouse URLs.
 */
export async function handleScrapeJob(
  env: Env,
  url: string,
): Promise<ScrapedPage & { pdfUrl?: string }> {
  const ghParsed = parseGreenhouseUrl(url);

  // Fire BR methods concurrently
  const [mdResult, pdfResult] = await Promise.allSettled([
    extractMarkdown(env, url),
    capturePdf(env, url),
  ]);

  const mdOk = mdResult.status === "fulfilled" && mdResult.value.length > 100;
  const pdfOk = pdfResult.status === "fulfilled";

  // Upload PDF to R2 if available
  let pdfUrl: string | undefined;
  if (pdfOk) {
    try {
      const key = `job-postings/${crypto.randomUUID()}.pdf`;
      pdfUrl = await uploadPdfToR2(env, key, pdfResult.value, {
        sourceUrl: url,
        capturedAt: new Date().toISOString(),
      });
    } catch {
      console.error("PDF R2 upload failed (non-fatal)");
    }
  }

  if (mdOk) {
    return {
      html: "",
      text: mdResult.value,
      markdown: mdResult.value,
      links: [{ href: url }],
      pdfUrl,
    };
  }

  // Fallback to Greenhouse API for Greenhouse URLs
  if (ghParsed) {
    try {
      const ghResult = await scrapeGreenhouseJob(ghParsed.boardToken, ghParsed.jobId);
      return { ...ghResult, pdfUrl };
    } catch (error) {
      console.error(
        `Greenhouse API fallback also failed for ${url}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  throw new Error(`All scrape methods failed for ${url}`);
}

export async function handleExtractJobDetails(env: Env, text: string) {
  return extract(env, { text, schema: JobPosting });
}
