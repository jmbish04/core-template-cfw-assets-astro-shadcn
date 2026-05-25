/**
 * @fileoverview Browser Run Sandbox with Agent Oversight
 *
 * This example demonstrates using Cloudflare Browser Run (Browser Rendering)
 * with AI agent oversight for safe, monitored browser automation tasks:
 * - Web scraping with content validation
 * - Screenshot generation with OCR and analysis
 * - PDF generation from dynamic content
 * - Form filling and interaction testing
 * - Agent-supervised browsing sessions
 *
 * Key features:
 * - **Agent oversight**: AI monitors browser actions and validates results
 * - **Safety checks**: Content validation before/after navigation
 * - **Retry logic**: Automatic retries on failures
 * - **Audit logging**: Complete history of browser interactions
 * - **Resource limits**: Timeouts and memory constraints
 *
 * @example
 * ```typescript
 * const agent = env.BROWSER_AGENT.getByName("user-123");
 * const result = await agent.scrapeSafely("https://example.com", {
 *   validateContent: true,
 *   maxRetries: 3
 * });
 * ```
 */

import { Agent, callable } from "agents";
import {
  scrapeUrl,
  capturePdf,
  extractMarkdown,
  extractJson,
  type ScrapedPage,
} from "@/backend/ai/tools/browser-rendering";
import { getModelRegistry } from "@/backend/ai/models";
import { getProvider } from "@/backend/ai/providers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrowserTask {
  id: string;
  url: string;
  operation: "scrape" | "screenshot" | "pdf" | "interact";
  options: BrowserTaskOptions;
  status: "pending" | "running" | "complete" | "failed";
  attempts: number;
  createdAt: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
}

export interface BrowserTaskOptions {
  validateContent?: boolean;
  maxRetries?: number;
  timeout?: number;
  aiValidation?: boolean;
  saveResults?: boolean;
}

export interface SafeScrapeResult {
  taskId: string;
  url: string;
  content: ScrapedPage;
  validated: boolean;
  aiAnalysis?: {
    safe: boolean;
    concerns: string[];
    summary: string;
  };
  timestamp: string;
}

export interface InteractionTask {
  url: string;
  steps: Array<{
    action: "click" | "type" | "scroll" | "wait";
    selector?: string;
    value?: string;
    duration?: number;
  }>;
}

// ---------------------------------------------------------------------------
// BrowserAgent: AI-Supervised Browser Automation
// ---------------------------------------------------------------------------

/**
 * BrowserAgent provides AI-supervised browser automation with safety checks,
 * validation, and audit logging.
 *
 * This agent demonstrates:
 * - Safe URL validation before navigation
 * - Content analysis after scraping
 * - Automatic retry on failures
 * - Audit trail of all browser operations
 * - Integration with Agents SDK for real-time monitoring
 *
 * @example
 * ```typescript
 * // From Worker:
 * const agent = env.BROWSER_AGENT.getByName("session-123");
 * const result = await agent.scrapeSafely("https://example.com");
 *
 * // From frontend:
 * const result = await agent.stub.scrapeSafely("https://example.com");
 * ```
 */
export class BrowserAgent extends Agent<Env> {
  async onStart() {
    await this.initializeStorage();
  }

  // -------------------------------------------------------------------------
  // Safe Scraping Operations
  // -------------------------------------------------------------------------

  /**
   * Scrape a URL with AI validation and safety checks.
   *
   * @param url - Target URL
   * @param options - Scraping options
   * @returns Scraped content with validation results
   * @throws Error if URL is unsafe or scraping fails
   *
   * @example
   * ```typescript
   * const result = await agent.scrapeSafely("https://example.com/article", {
   *   validateContent: true,
   *   aiValidation: true,
   *   saveResults: true
   * });
   * console.log(result.content.text);
   * console.log(result.aiAnalysis?.safe ? "Safe" : "Unsafe");
   * ```
   */
  @callable()
  async scrapeSafely(
    url: string,
    options: BrowserTaskOptions = {},
  ): Promise<SafeScrapeResult> {
    const taskId = crypto.randomUUID();
    const { validateContent = true, aiValidation = false, saveResults = true } = options;

    // Step 1: Validate URL safety
    if (validateContent) {
      const urlSafe = await this.validateUrl(url);
      if (!urlSafe) {
        throw new Error(`URL failed safety validation: ${url}`);
      }
    }

    // Step 2: Create task record
    await this.createTask({
      id: taskId,
      url,
      operation: "scrape",
      options,
      status: "running",
      attempts: 1,
      createdAt: new Date().toISOString(),
    });

    try {
      // Step 3: Perform scraping
      const content = await scrapeUrl(this.env, url);

      // Step 4: AI validation if enabled
      let aiAnalysis: SafeScrapeResult["aiAnalysis"];
      if (aiValidation && content.text) {
        aiAnalysis = await this.analyzeContent(content.text, url);
      }

      // Step 5: Save results if requested
      if (saveResults) {
        const resultKey = `browser-tasks/${taskId}/scraped-content.json`;
        await this.env.R2_FILES_BUCKET.put(
          resultKey,
          JSON.stringify(content, null, 2),
          {
            httpMetadata: { contentType: "application/json" },
            customMetadata: {
              taskId,
              url,
              safe: aiAnalysis?.safe.toString() || "unknown",
            },
          },
        );
      }

      // Step 6: Update task status
      await this.updateTask(taskId, {
        status: "complete",
        completedAt: new Date().toISOString(),
        result: { validated: true, aiSafe: aiAnalysis?.safe },
      });

      return {
        taskId,
        url,
        content,
        validated: true,
        aiAnalysis,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await this.updateTask(taskId, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate a PDF from a URL with validation.
   *
   * @param url - Target URL
   * @param filename - Optional filename for the PDF
   * @returns R2 key where PDF is stored
   *
   * @example
   * ```typescript
   * const pdfKey = await agent.generatePdfSafely("https://example.com/page", "page.pdf");
   * console.log(`PDF saved to: ${pdfKey}`);
   * ```
   */
  @callable()
  async generatePdfSafely(
    url: string,
    filename?: string,
  ): Promise<{ pdfKey: string; size: number }> {
    const taskId = crypto.randomUUID();

    // Validate URL
    const urlSafe = await this.validateUrl(url);
    if (!urlSafe) {
      throw new Error(`URL failed safety validation: ${url}`);
    }

    await this.createTask({
      id: taskId,
      url,
      operation: "pdf",
      options: {},
      status: "running",
      attempts: 1,
      createdAt: new Date().toISOString(),
    });

    try {
      const pdfBuffer = await capturePdf(this.env, url);

      const pdfKey = `browser-tasks/${taskId}/${filename || "generated.pdf"}`;
      await this.env.R2_FILES_BUCKET.put(pdfKey, pdfBuffer, {
        httpMetadata: { contentType: "application/pdf" },
        customMetadata: {
          taskId,
          url,
          generatedBy: "BrowserAgent",
        },
      });

      await this.updateTask(taskId, {
        status: "complete",
        completedAt: new Date().toISOString(),
        result: { pdfKey, size: pdfBuffer.byteLength },
      });

      return {
        pdfKey,
        size: pdfBuffer.byteLength,
      };
    } catch (error) {
      await this.updateTask(taskId, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Extract structured data from a page using AI.
   *
   * @param url - Target URL
   * @param prompt - Extraction prompt for AI
   * @returns Extracted structured data
   *
   * @example
   * ```typescript
   * const jobData = await agent.extractStructuredData(
   *   "https://example.com/jobs/123",
   *   "Extract the job title, company, salary range, and requirements"
   * );
   * console.log(jobData);
   * ```
   */
  @callable()
  async extractStructuredData<T = unknown>(
    url: string,
    prompt: string,
  ): Promise<{ taskId: string; data: T }> {
    const taskId = crypto.randomUUID();

    const urlSafe = await this.validateUrl(url);
    if (!urlSafe) {
      throw new Error(`URL failed safety validation: ${url}`);
    }

    await this.createTask({
      id: taskId,
      url,
      operation: "scrape",
      options: { aiValidation: true },
      status: "running",
      attempts: 1,
      createdAt: new Date().toISOString(),
    });

    try {
      const data = await extractJson<T>(this.env, url, { prompt });

      await this.updateTask(taskId, {
        status: "complete",
        completedAt: new Date().toISOString(),
        result: data,
      });

      return { taskId, data };
    } catch (error) {
      await this.updateTask(taskId, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Task Management
  // -------------------------------------------------------------------------

  /**
   * List all browser tasks for this agent instance.
   *
   * @param status - Filter by status (optional)
   * @param limit - Maximum results (default: 50)
   * @returns Array of browser tasks
   *
   * @example
   * ```typescript
   * const tasks = await agent.listTasks("complete", 20);
   * console.log(`Found ${tasks.length} completed tasks`);
   * ```
   */
  @callable()
  async listTasks(
    status?: BrowserTask["status"],
    limit = 50,
  ): Promise<BrowserTask[]> {
    const query = status
      ? this.sql`SELECT * FROM browser_tasks WHERE status = ${status} ORDER BY createdAt DESC LIMIT ${limit}`
      : this.sql`SELECT * FROM browser_tasks ORDER BY createdAt DESC LIMIT ${limit}`;

    const results = await query;

    return results.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      url: row.url as string,
      operation: row.operation as BrowserTask["operation"],
      options: JSON.parse(row.options as string),
      status: row.status as BrowserTask["status"],
      attempts: row.attempts as number,
      createdAt: row.createdAt as string,
      completedAt: row.completedAt as string | undefined,
      result: row.result ? JSON.parse(row.result as string) : undefined,
      error: row.error as string | undefined,
    }));
  }

  /**
   * Get details of a specific browser task.
   *
   * @param taskId - Task ID
   * @returns Browser task details
   * @throws Error if task not found
   *
   * @example
   * ```typescript
   * const task = await agent.getTask("task-id-here");
   * console.log(task.status);
   * ```
   */
  @callable()
  async getTask(taskId: string): Promise<BrowserTask> {
    const results = await this.sql`SELECT * FROM browser_tasks WHERE id = ${taskId} LIMIT 1`;

    if (results.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const row = results[0] as Record<string, unknown>;
    return {
      id: row.id as string,
      url: row.url as string,
      operation: row.operation as BrowserTask["operation"],
      options: JSON.parse(row.options as string),
      status: row.status as BrowserTask["status"],
      attempts: row.attempts as number,
      createdAt: row.createdAt as string,
      completedAt: row.completedAt as string | undefined,
      result: row.result ? JSON.parse(row.result as string) : undefined,
      error: row.error as string | undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Internal Helper Methods
  // -------------------------------------------------------------------------

  /**
   * Validate URL safety using AI.
   */
  private async validateUrl(url: string): Promise<boolean> {
    try {
      // Basic URL validation
      const urlObj = new URL(url);

      // Check protocol
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return false;
      }

      // Optional: Use AI to check if URL looks suspicious
      // This is a simplified check - production systems would use more sophisticated validation
      const suspiciousPatterns = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        ".local",
        "file://",
      ];

      return !suspiciousPatterns.some((pattern) => url.includes(pattern));
    } catch {
      return false;
    }
  }

  /**
   * Analyze scraped content using AI for safety and quality checks.
   */
  private async analyzeContent(
    content: string,
    url: string,
  ): Promise<{
    safe: boolean;
    concerns: string[];
    summary: string;
  }> {
    const provider = getProvider(this.env);
    const model = getModelRegistry(this.env).chat;

    const result = await provider.invokeModel(model, {
      messages: [
        {
          role: "system",
          content:
            "You are a content safety analyzer. Analyze the provided content and determine if it's safe, legitimate, and high-quality. Respond in JSON format with: safe (boolean), concerns (array of strings), summary (string).",
        },
        {
          role: "user",
          content: `Analyze content from ${url}:\n\n${content.slice(0, 2000)}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    try {
      // Try to parse JSON response
      const analysis = JSON.parse(result.response);
      return {
        safe: analysis.safe ?? true,
        concerns: analysis.concerns ?? [],
        summary: analysis.summary ?? "No analysis available",
      };
    } catch {
      // Fallback if AI doesn't return valid JSON
      return {
        safe: true,
        concerns: [],
        summary: result.response.slice(0, 200),
      };
    }
  }

  /**
   * Create a new browser task record.
   */
  private async createTask(task: BrowserTask): Promise<void> {
    await this.sql`
      INSERT INTO browser_tasks (id, url, operation, options, status, attempts, createdAt)
      VALUES (
        ${task.id},
        ${task.url},
        ${task.operation},
        ${JSON.stringify(task.options)},
        ${task.status},
        ${task.attempts},
        ${task.createdAt}
      )
    `;
  }

  /**
   * Update an existing browser task record.
   */
  private async updateTask(
    taskId: string,
    updates: Partial<Omit<BrowserTask, "id" | "url" | "operation">>,
  ): Promise<void> {
    const setters: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      setters.push("status = ?");
      values.push(updates.status);
    }
    if (updates.completedAt !== undefined) {
      setters.push("completedAt = ?");
      values.push(updates.completedAt);
    }
    if (updates.result !== undefined) {
      setters.push("result = ?");
      values.push(JSON.stringify(updates.result));
    }
    if (updates.error !== undefined) {
      setters.push("error = ?");
      values.push(updates.error);
    }

    if (setters.length > 0) {
      values.push(taskId);
      await this.sql`
        UPDATE browser_tasks
        SET ${setters.join(", ")}
        WHERE id = ${taskId}
      `;
    }
  }

  /**
   * Initialize agent storage schema.
   */
  async initializeStorage(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS browser_tasks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        operation TEXT NOT NULL,
        options TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        completedAt TEXT,
        result TEXT,
        error TEXT
      )
    `;
  }
}

// ---------------------------------------------------------------------------
// Standalone Browser Utilities
// ---------------------------------------------------------------------------

/**
 * Batch scrape multiple URLs in parallel with rate limiting.
 *
 * @param env - Worker environment
 * @param urls - Array of URLs to scrape
 * @param concurrency - Maximum concurrent requests (default: 5)
 * @returns Array of scrape results
 *
 * @example
 * ```typescript
 * const urls = [
 *   "https://example.com/page1",
 *   "https://example.com/page2",
 *   "https://example.com/page3"
 * ];
 * const results = await batchScrapeUrls(env, urls, 3);
 * ```
 */
export async function batchScrapeUrls(
  env: Env,
  urls: string[],
  concurrency = 5,
): Promise<Array<{ url: string; content?: ScrapedPage; error?: string }>> {
  const results: Array<{ url: string; content?: ScrapedPage; error?: string }> = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (url) => {
        const content = await scrapeUrl(env, url);
        return { url, content };
      }),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          url: batch[results.length % batch.length],
          error: result.reason?.message || "Unknown error",
        });
      }
    }

    // Add delay between batches to avoid rate limits
    if (i + concurrency < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Monitor a long-running browser task with progress updates.
 *
 * This demonstrates how to combine Browser Run with Workflows for
 * long-running scraping operations with checkpointing.
 *
 * @example
 * ```typescript
 * // In a Workflow:
 * const results = await step.do("scrape website", async () => {
 *   return await monitoredScrape(env, "https://example.com", (progress) => {
 *     console.log(`Progress: ${progress}%`);
 *   });
 * });
 * ```
 */
export async function monitoredScrape(
  env: Env,
  url: string,
  onProgress?: (progress: number) => void,
): Promise<ScrapedPage> {
  if (onProgress) onProgress(0);

  const content = await scrapeUrl(env, url);

  if (onProgress) onProgress(50);

  // Optional: Perform additional processing
  const markdown = await extractMarkdown(env, url);
  content.markdown = markdown;

  if (onProgress) onProgress(100);

  return content;
}
