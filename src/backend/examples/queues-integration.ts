/**
 * @fileoverview Cloudflare Queues Integration Example
 *
 * This example demonstrates producer/consumer patterns using Cloudflare Queues for:
 * - Document processing pipeline (batch PDF generation)
 * - Email notification system (rate-limited sending)
 * - Web scraping job queue (parallel processing with Browser Run)
 *
 * Key features:
 * - Producer: Write messages to queue with structured payloads
 * - Consumer: Process messages in batches with automatic retry
 * - Dead Letter Queue: Handle failed messages
 * - Integration: Queues + Workflows + Browser Run
 *
 * @example Producer (from API route):
 * ```typescript
 * await env.DOCUMENT_QUEUE.send({
 *   docId: "abc123",
 *   operation: "generate_pdf",
 *   userId: "user-456"
 * });
 * ```
 *
 * @example Consumer (queue handler):
 * ```typescript
 * export default {
 *   async queue(batch: MessageBatch, env: Env) {
 *     for (const message of batch.messages) {
 *       await processDocument(message.body, env);
 *     }
 *   }
 * };
 * ```
 */

import type { MessageBatch } from "@cloudflare/workers-types";
import { capturePdf } from "@/backend/ai/tools/browser-rendering";
import { GoogleDocsClient } from "@/backend/ai/tools/google/docs";

// ---------------------------------------------------------------------------
// Message Types
// ---------------------------------------------------------------------------

export interface DocumentProcessingMessage {
  docId: string;
  operation: "generate_pdf" | "generate_markdown" | "backup";
  userId: string;
  options?: {
    folderId?: string;
    includeComments?: boolean;
  };
}

export interface EmailNotificationMessage {
  to: string;
  subject: string;
  body: string;
  userId: string;
  priority: "high" | "normal" | "low";
}

export interface WebScrapingMessage {
  url: string;
  taskId: string;
  userId: string;
  extractionType: "screenshot" | "pdf" | "markdown" | "json";
  prompt?: string;
}

// ---------------------------------------------------------------------------
// Producer Functions (Send messages to queue)
// ---------------------------------------------------------------------------

/**
 * Queue a document for PDF generation.
 *
 * @param env - Worker environment bindings
 * @param docId - Google Docs ID
 * @param userId - User ID for tracking
 * @returns Queue message ID
 *
 * @example
 * ```typescript
 * // From API route:
 * const messageId = await queueDocumentPdfGeneration(env, "doc-123", "user-456");
 * return c.json({ queued: true, messageId });
 * ```
 */
export async function queueDocumentPdfGeneration(
  env: Env,
  docId: string,
  userId: string,
  options?: DocumentProcessingMessage["options"],
): Promise<string> {
  const message: DocumentProcessingMessage = {
    docId,
    operation: "generate_pdf",
    userId,
    options,
  };

  // Send to queue (returns void by default, but we can generate our own ID)
  await env.DOCUMENT_QUEUE.send(message);

  // Generate tracking ID
  const messageId = crypto.randomUUID();
  console.log(`Queued document PDF generation: ${docId} (${messageId})`);

  return messageId;
}

/**
 * Queue an email notification with priority.
 *
 * @param env - Worker environment bindings
 * @param notification - Email notification details
 * @returns Queue message ID
 *
 * @example
 * ```typescript
 * await queueEmailNotification(env, {
 *   to: "user@example.com",
 *   subject: "Your resume is ready",
 *   body: "Click here to view...",
 *   userId: "user-123",
 *   priority: "high"
 * });
 * ```
 */
export async function queueEmailNotification(
  env: Env,
  notification: EmailNotificationMessage,
): Promise<string> {
  await env.EMAIL_QUEUE.send(notification);

  const messageId = crypto.randomUUID();
  console.log(`Queued email notification: ${notification.to} (priority: ${notification.priority})`);

  return messageId;
}

/**
 * Queue a web scraping task for parallel processing.
 *
 * @param env - Worker environment bindings
 * @param task - Scraping task details
 * @returns Queue message ID
 *
 * @example
 * ```typescript
 * // Queue multiple URLs for parallel scraping
 * const urls = ["https://example.com/page1", "https://example.com/page2"];
 * await Promise.all(
 *   urls.map(url => queueWebScrapingTask(env, {
 *     url,
 *     taskId: crypto.randomUUID(),
 *     userId: "user-123",
 *     extractionType: "markdown"
 *   }))
 * );
 * ```
 */
export async function queueWebScrapingTask(
  env: Env,
  task: WebScrapingMessage,
): Promise<string> {
  await env.SCRAPING_QUEUE.send(task);

  console.log(`Queued web scraping task: ${task.url} (${task.extractionType})`);

  return task.taskId;
}

/**
 * Batch queue multiple documents for processing.
 *
 * Queues support batch sending for efficiency when queuing many messages at once.
 *
 * @param env - Worker environment bindings
 * @param documents - Array of documents to queue
 * @returns Count of queued documents
 *
 * @example
 * ```typescript
 * const docs = [
 *   { docId: "doc1", userId: "user-123" },
 *   { docId: "doc2", userId: "user-123" },
 *   { docId: "doc3", userId: "user-456" }
 * ];
 * const count = await batchQueueDocuments(env, docs);
 * console.log(`Queued ${count} documents`);
 * ```
 */
export async function batchQueueDocuments(
  env: Env,
  documents: Array<{ docId: string; userId: string }>,
): Promise<number> {
  const messages: DocumentProcessingMessage[] = documents.map((doc) => ({
    docId: doc.docId,
    operation: "generate_pdf" as const,
    userId: doc.userId,
  }));

  // Send all messages at once (more efficient than individual sends)
  await env.DOCUMENT_QUEUE.sendBatch(
    messages.map((body) => ({ body })),
  );

  console.log(`Batch queued ${messages.length} documents`);
  return messages.length;
}

// ---------------------------------------------------------------------------
// Consumer Functions (Process messages from queue)
// ---------------------------------------------------------------------------

/**
 * Process a batch of document generation messages.
 *
 * This function is called by the queue consumer handler.
 * It processes messages in parallel within the batch for maximum throughput.
 *
 * @param batch - Message batch from queue
 * @param env - Worker environment bindings
 *
 * @example In your worker export:
 * ```typescript
 * export default {
 *   async queue(batch: MessageBatch<DocumentProcessingMessage>, env: Env) {
 *     await processDocumentBatch(batch, env);
 *   }
 * };
 * ```
 */
export async function processDocumentBatch(
  batch: MessageBatch<DocumentProcessingMessage>,
  env: Env,
): Promise<void> {
  console.log(`Processing document batch: ${batch.messages.length} messages`);

  const results = await Promise.allSettled(
    batch.messages.map((message) => processDocumentMessage(message.body, env)),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`Document batch complete: ${succeeded} succeeded, ${failed} failed`);

  // Failed messages will be automatically retried by the queue system
  // If retry limit is reached, they'll be sent to the dead letter queue
}

/**
 * Process a single document message.
 *
 * @param message - Document processing message
 * @param env - Worker environment bindings
 * @throws Error if processing fails (triggers queue retry)
 */
async function processDocumentMessage(
  message: DocumentProcessingMessage,
  env: Env,
): Promise<void> {
  const { docId, operation, userId, _options } = message;

  try {
    const docsClient = new GoogleDocsClient(env);

    switch (operation) {
      case "generate_pdf": {
        // Read the Google Doc
        const content = await docsClient.read(docId);

        // Generate PDF using Browser Run
        // (In production, you'd create a temporary HTML page and render it)
        const pdfBuffer = await capturePdf(env, `https://docs.google.com/document/d/${docId}/export?format=html`);

        // Store PDF in R2
        const pdfKey = `users/${userId}/documents/${docId}/generated.pdf`;
        await env.R2_FILES_BUCKET.put(pdfKey, pdfBuffer, {
          httpMetadata: {
            contentType: "application/pdf",
          },
        });

        console.log(`Generated PDF for ${docId}: ${pdfKey}`);
        break;
      }

      case "generate_markdown": {
        const content = await docsClient.read(docId);

        // Store markdown in R2
        const mdKey = `users/${userId}/documents/${docId}/content.md`;
        await env.R2_FILES_BUCKET.put(mdKey, content, {
          httpMetadata: {
            contentType: "text/markdown",
          },
        });

        console.log(`Generated markdown for ${docId}: ${mdKey}`);
        break;
      }

      case "backup": {
        // Backup document content to R2
        const content = await docsClient.read(docId);
        const backupKey = `users/${userId}/backups/${docId}/${Date.now()}.txt`;
        await env.R2_FILES_BUCKET.put(backupKey, content);

        console.log(`Backed up ${docId}: ${backupKey}`);
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error(`Failed to process document ${docId}:`, error);
    throw error; // Re-throw to trigger queue retry
  }
}

/**
 * Process a batch of email notifications with rate limiting.
 *
 * Emails are sent one at a time with delays to respect rate limits.
 *
 * @param batch - Message batch from queue
 * @param env - Worker environment bindings
 */
export async function processEmailBatch(
  batch: MessageBatch<EmailNotificationMessage>,
  env: Env,
): Promise<void> {
  console.log(`Processing email batch: ${batch.messages.length} messages`);

  // Sort by priority (high > normal > low)
  const priorityOrder = { high: 3, normal: 2, low: 1 };
  const sorted = batch.messages.sort(
    (a, b) => priorityOrder[b.body.priority] - priorityOrder[a.body.priority],
  );

  for (const message of sorted) {
    try {
      await sendEmail(message.body, env);

      // Add delay to respect rate limits (e.g., 10 emails/second)
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to send email to ${message.body.to}:`, error);
      // Don't throw - we don't want one failed email to fail the whole batch
    }
  }

  console.log(`Email batch complete`);
}

/**
 * Send a single email (mock implementation).
 *
 * In production, integrate with your email service (SendGrid, Mailgun, etc.)
 */
async function sendEmail(message: EmailNotificationMessage, _env: Env): Promise<void> {
  console.log(`Sending email to ${message.to}: ${message.subject}`);

  // Mock implementation - replace with actual email service
  // Example with a hypothetical email service:
  // await fetch("https://api.emailservice.com/send", {
  //   method: "POST",
  //   headers: { "Authorization": `Bearer ${env.EMAIL_API_KEY}` },
  //   body: JSON.stringify({
  //     to: message.to,
  //     subject: message.subject,
  //     body: message.body
  //   })
  // });
}

/**
 * Process a batch of web scraping tasks using Browser Run.
 *
 * Tasks are processed in parallel up to the batch size limit.
 *
 * @param batch - Message batch from queue
 * @param env - Worker environment bindings
 */
export async function processScrapingBatch(
  batch: MessageBatch<WebScrapingMessage>,
  env: Env,
): Promise<void> {
  console.log(`Processing scraping batch: ${batch.messages.length} messages`);

  const results = await Promise.allSettled(
    batch.messages.map((message) => processScrapingTask(message.body, env)),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`Scraping batch complete: ${succeeded} succeeded, ${failed} failed`);
}

/**
 * Process a single web scraping task.
 *
 * @param task - Scraping task message
 * @param env - Worker environment bindings
 */
async function processScrapingTask(task: WebScrapingMessage, env: Env): Promise<void> {
  const { url, taskId, userId, extractionType } = task;

  try {
    let result: ArrayBuffer | string;
    let contentType: string;
    let extension: string;

    switch (extractionType) {
      case "pdf": {
        result = await capturePdf(env, url);
        contentType = "application/pdf";
        extension = "pdf";
        break;
      }

      // Add other extraction types as needed
      // case "screenshot": ...
      // case "markdown": ...
      // case "json": ...

      default:
        throw new Error(`Unknown extraction type: ${extractionType}`);
    }

    // Store result in R2
    const resultKey = `users/${userId}/scraping/${taskId}/result.${extension}`;
    await env.R2_FILES_BUCKET.put(resultKey, result, {
      httpMetadata: { contentType },
    });

    console.log(`Scraped ${url} -> ${resultKey}`);
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    throw error; // Re-throw to trigger queue retry
  }
}

// ---------------------------------------------------------------------------
// Dead Letter Queue Handler
// ---------------------------------------------------------------------------

/**
 * Process messages that failed after all retries.
 *
 * This handler receives messages from the dead letter queue for final processing.
 * Typical actions: log to database, send alerts, or attempt manual recovery.
 *
 * @param batch - Dead letter queue message batch
 * @param env - Worker environment bindings
 *
 * @example In your worker export:
 * ```typescript
 * export default {
 *   async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext) {
 *     // Determine if this is the DLQ based on queue name or separate export
 *     if (batch.queue === "document-queue-dlq") {
 *       await processDeadLetterQueue(batch, env);
 *     } else {
 *       await processDocumentBatch(batch, env);
 *     }
 *   }
 * };
 * ```
 */
export async function processDeadLetterQueue(
  batch: MessageBatch<unknown>,
  env: Env,
): Promise<void> {
  console.warn(`Processing dead letter queue: ${batch.messages.length} failed messages`);

  for (const message of batch.messages) {
    // Log failed message to D1 for investigation
    try {
      // await db.insert(failedMessages).values({
      //   messageId: message.id,
      //   body: JSON.stringify(message.body),
      //   failedAt: new Date().toISOString(),
      //   attempts: message.attempts
      // });

      console.error(`Dead letter message:`, {
        id: message.id,
        body: message.body,
        timestamp: message.timestamp,
      });
    } catch (error) {
      console.error(`Failed to log dead letter message:`, error);
    }
  }
}

// ---------------------------------------------------------------------------
// Queue Configuration Example
// ---------------------------------------------------------------------------

/**
 * Example wrangler.jsonc configuration for these queues:
 *
 * ```jsonc
 * {
 *   "queues": {
 *     "producers": [
 *       {
 *         "name": "document-queue",
 *         "binding": "DOCUMENT_QUEUE"
 *       },
 *       {
 *         "name": "email-queue",
 *         "binding": "EMAIL_QUEUE"
 *       },
 *       {
 *         "name": "scraping-queue",
 *         "binding": "SCRAPING_QUEUE"
 *       }
 *     ],
 *     "consumers": [
 *       {
 *         "name": "document-queue",
 *         "dead_letter_queue": "document-queue-dlq",
 *         "retry_delay": 300,
 *         "max_batch_size": 10,
 *         "max_batch_timeout": 5,
 *         "max_retries": 3
 *       },
 *       {
 *         "name": "email-queue",
 *         "max_batch_size": 100,
 *         "max_batch_timeout": 30,
 *         "max_retries": 2
 *       },
 *       {
 *         "name": "scraping-queue",
 *         "max_batch_size": 5,
 *         "max_batch_timeout": 10,
 *         "max_retries": 3,
 *         "max_concurrency": 10
 *       },
 *       {
 *         "name": "document-queue-dlq",
 *         "max_batch_size": 10,
 *         "max_batch_timeout": 5
 *       }
 *     ]
 *   }
 * }
 * ```
 */
