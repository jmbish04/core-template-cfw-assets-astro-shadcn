/**
 * @fileoverview Cloudflare Workflows Integration Example
 *
 * This example demonstrates durable execution patterns using Cloudflare Workflows for:
 * - Multi-step document processing pipeline
 * - Long-running approval workflows with human-in-the-loop
 * - AI content generation with retries and checkpoints
 * - Integration with Agents SDK for real-time progress updates
 *
 * Key features:
 * - **Durable execution**: Steps persist across failures, no timeouts
 * - **Automatic retries**: Built-in retry logic with exponential backoff
 * - **External events**: Pause for user approvals or webhook callbacks
 * - **Step isolation**: Each step is idempotent and independently retryable
 * - **AgentWorkflow**: Bidirectional communication with Agents
 *
 * @example Starting a workflow:
 * ```typescript
 * const instance = await env.DOCUMENT_WORKFLOW.create({
 *   params: { userId: "user-123", docId: "doc-456" }
 * });
 * console.log(instance.id); // Use this ID to check status or send events
 * ```
 *
 * @example Sending an event to a waiting workflow:
 * ```typescript
 * await env.DOCUMENT_WORKFLOW.get(instanceId).sendEvent("approval", {
 *   approved: true,
 *   comments: "Looks great!"
 * });
 * ```
 */

import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { WorkflowEvent } from "cloudflare:workers";
import { GoogleDocsClient } from "@/backend/ai/tools/google/docs";
import { consultNotebook } from "@/backend/ai/tools/notebooklm";
import { getModelRegistry } from "@/backend/ai/models";
import { getProvider } from "@/backend/ai/providers";
import { capturePdf } from "@/backend/ai/tools/browser-rendering";

// ---------------------------------------------------------------------------
// Workflow Parameter Types
// ---------------------------------------------------------------------------

export interface DocumentProcessingParams {
  userId: string;
  docId: string;
  templateId?: string;
  operations: Array<"generate_pdf" | "ai_review" | "backup" | "notify">;
  requiresApproval?: boolean;
}

export interface ApprovalWorkflowParams {
  userId: string;
  docId: string;
  approvers: string[];
  timeoutHours: number;
  autoApproveAfterTimeout?: boolean;
}

export interface AIContentGenerationParams {
  userId: string;
  prompt: string;
  targetDocId?: string;
  maxIterations: number;
  notebookContext?: boolean;
}

// ---------------------------------------------------------------------------
// Example 1: Multi-Step Document Processing Workflow
// ---------------------------------------------------------------------------

/**
 * DocumentProcessingWorkflow: Durable pipeline for document operations.
 *
 * This workflow demonstrates:
 * - Sequential step execution with automatic checkpointing
 * - Retry configuration per step
 * - Integration with Google Docs, R2, and Browser Run
 * - Error handling and recovery
 *
 * Steps:
 * 1. Validate document access
 * 2. Read document content
 * 3. Generate PDF (if requested)
 * 4. AI review (if requested)
 * 5. Backup to R2 (if requested)
 * 6. Send notification (if requested)
 *
 * @example
 * ```typescript
 * // Start workflow
 * const instance = await env.DOCUMENT_WORKFLOW.create({
 *   params: {
 *     userId: "user-123",
 *     docId: "doc-456",
 *     operations: ["generate_pdf", "ai_review", "backup"],
 *     requiresApproval: false
 *   }
 * });
 *
 * // Check workflow status
 * const status = await env.DOCUMENT_WORKFLOW.get(instance.id).status();
 * console.log(status.status); // "running", "complete", "errored"
 * ```
 */
export class DocumentProcessingWorkflow extends WorkflowEntrypoint<
  Env,
  DocumentProcessingParams
> {
  async run(event: WorkflowEvent<DocumentProcessingParams>, step: WorkflowStep) {
    const { userId, docId, operations, requiresApproval } = event.payload;

    // Step 1: Validate document access
    const validation = await step.do("validate document", async () => {
      const docsClient = new GoogleDocsClient(this.env);
      const content = await docsClient.read(docId);
      return {
        valid: content.length > 0,
        contentLength: content.length,
      };
    });

    if (!validation.valid) {
      throw new Error("Document validation failed: empty or inaccessible");
    }

    // Step 2: Read document content (cached for subsequent steps)
    const content = await step.do("read document", async () => {
      const docsClient = new GoogleDocsClient(this.env);
      return docsClient.read(docId);
    });

    // Step 3: Generate PDF if requested
    if (operations.includes("generate_pdf")) {
      await step.do(
        "generate PDF",
        {
          retries: {
            limit: 3,
            delay: "10 seconds",
            backoff: "exponential",
          },
        },
        async () => {
          const pdfBuffer = await capturePdf(
            this.env,
            `https://docs.google.com/document/d/${docId}/export?format=html`,
          );

          const pdfKey = `users/${userId}/documents/${docId}/generated-${Date.now()}.pdf`;
          await this.env.R2_FILES_BUCKET.put(pdfKey, pdfBuffer, {
            httpMetadata: {
              contentType: "application/pdf",
            },
            customMetadata: {
              userId,
              docId,
              generatedBy: "DocumentProcessingWorkflow",
            },
          });

          return { pdfKey, size: pdfBuffer.byteLength };
        },
      );
    }

    // Step 4: AI review if requested
    let aiReview: { feedback: string; score: number } | null = null;
    if (operations.includes("ai_review")) {
      aiReview = await step.do(
        "AI review",
        {
          retries: {
            limit: 2,
            delay: "5 seconds",
            backoff: "linear",
          },
        },
        async () => {
          const provider = getProvider(this.env);
          const model = getModelRegistry(this.env).chat;

          const result = await provider.invokeModel(model, {
            messages: [
              {
                role: "system",
                content:
                  "You are a professional editor. Review the document and provide concise feedback.",
              },
              {
                role: "user",
                content: `Please review this document:\n\n${content.slice(0, 3000)}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 500,
          });

          return {
            feedback: result.response,
            score: Math.floor(Math.random() * 30) + 70, // Mock score 70-100
          };
        },
      );
    }

    // Step 5: Wait for approval if required
    if (requiresApproval) {
      // Sleep to give user time to review
      await step.sleep("wait for review window", "5 minutes");

      // Wait for approval event (with 24 hour timeout)
      const approval = await step.waitForEvent<{ approved: boolean; comments?: string }>(
        "wait for approval",
      );

      if (!approval.approved) {
        throw new Error(`Workflow rejected: ${approval.comments || "No reason provided"}`);
      }
    }

    // Step 6: Backup to R2 if requested
    if (operations.includes("backup")) {
      await step.do("backup document", async () => {
        const backupKey = `users/${userId}/backups/${docId}/${Date.now()}.txt`;
        await this.env.R2_FILES_BUCKET.put(backupKey, content, {
          customMetadata: {
            userId,
            docId,
            backupType: "workflow",
            aiReviewScore: aiReview?.score.toString() || "n/a",
          },
        });

        return { backupKey };
      });
    }

    // Step 7: Send notification if requested
    if (operations.includes("notify")) {
      await step.do("send notification", async () => {
        // In production, send via email queue or notification service
        console.log(`Notification: Document ${docId} processing complete for user ${userId}`);

        // Example: Queue email notification
        // await this.env.EMAIL_QUEUE.send({
        //   to: userEmail,
        //   subject: "Document Processing Complete",
        //   body: `Your document has been processed. AI Review Score: ${aiReview?.score || 'N/A'}`
        // });

        return { sent: true };
      });
    }

    // Return final workflow result
    return {
      success: true,
      docId,
      userId,
      completedOperations: operations,
      aiReview,
      timestamp: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Example 2: Approval Workflow with Timeout
// ---------------------------------------------------------------------------

/**
 * ApprovalWorkflow: Multi-stakeholder approval with timeout.
 *
 * This workflow demonstrates:
 * - Multiple sequential approvals
 * - Timeout handling with auto-approval option
 * - Event-driven state transitions
 * - Approval audit trail
 *
 * @example
 * ```typescript
 * // Start approval workflow
 * const instance = await env.APPROVAL_WORKFLOW.create({
 *   params: {
 *     userId: "user-123",
 *     docId: "doc-456",
 *     approvers: ["manager-1", "director-2"],
 *     timeoutHours: 24,
 *     autoApproveAfterTimeout: false
 *   }
 * });
 *
 * // Approver submits approval
 * await env.APPROVAL_WORKFLOW.get(instance.id).sendEvent("approval-manager-1", {
 *   approved: true,
 *   comments: "LGTM"
 * });
 * ```
 */
export class ApprovalWorkflow extends WorkflowEntrypoint<Env, ApprovalWorkflowParams> {
  async run(event: WorkflowEvent<ApprovalWorkflowParams>, step: WorkflowStep) {
    const { userId, docId, approvers, timeoutHours, autoApproveAfterTimeout } = event.payload;

    const approvals: Array<{
      approver: string;
      approved: boolean;
      timestamp: string;
      comments?: string;
    }> = [];

    // Step 1: Load document metadata
    const _docMetadata = await step.do("load document", async () => {
      const docsClient = new GoogleDocsClient(this.env);
      const content = await docsClient.read(docId);
      return {
        docId,
        contentLength: content.length,
      };
    });

    // Step 2: Sequential approvals
    for (const approver of approvers) {
      // Sleep briefly between approval requests to avoid overwhelming approvers
      if (approvals.length > 0) {
        await step.sleep(`pause before ${approver}`, "30 seconds");
      }

      const approved = await step.do(
        `request approval from ${approver}`,
        async (ctx) => {
          // Send notification to approver (mock)
          console.log(`Requesting approval from ${approver} (attempt ${ctx.attempt})`);

          // In production, send email/notification here
          // await this.env.EMAIL_QUEUE.send({
          //   to: approverEmail,
          //   subject: "Approval Required",
          //   body: `Please review document ${docId}`
          // });

          return true; // Notification sent
        },
      );

      if (!approved) {
        throw new Error(`Failed to notify approver: ${approver}`);
      }

      // Wait for approval event with timeout
      const timeoutDuration = `${timeoutHours} hours`;

      try {
        const approvalResponse = await Promise.race([
          step.waitForEvent<{ approved: boolean; comments?: string }>(
            `approval from ${approver}`,
          ),
          step.sleep(`timeout for ${approver}`, timeoutDuration).then(() => null),
        ]);

        if (approvalResponse === null) {
          // Timeout occurred
          if (autoApproveAfterTimeout) {
            approvals.push({
              approver,
              approved: true,
              timestamp: new Date().toISOString(),
              comments: "Auto-approved after timeout",
            });
          } else {
            throw new Error(`Approval timeout: ${approver} did not respond within ${timeoutHours} hours`);
          }
        } else {
          approvals.push({
            approver,
            approved: approvalResponse.approved,
            timestamp: new Date().toISOString(),
            comments: approvalResponse.comments,
          });

          if (!approvalResponse.approved) {
            throw new Error(`Approval rejected by ${approver}: ${approvalResponse.comments || "No reason"}`);
          }
        }
      } catch (error) {
        console.error(`Approval step failed for ${approver}:`, error);
        throw error;
      }
    }

    // Step 3: Final approval processing
    await step.do("finalize approval", async () => {
      // Store approval record in D1 (mock)
      console.log(`All approvals received for ${docId}`);

      // In production:
      // await db.insert(approvalRecords).values({
      //   docId,
      //   userId,
      //   approvals: JSON.stringify(approvals),
      //   finalizedAt: new Date().toISOString()
      // });

      return true;
    });

    return {
      success: true,
      docId,
      userId,
      approvals,
      finalizedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Example 3: AI Content Generation with Iterative Refinement
// ---------------------------------------------------------------------------

/**
 * AIContentGenerationWorkflow: Multi-iteration AI content generation.
 *
 * This workflow demonstrates:
 * - Iterative AI generation with feedback loops
 * - Integration with NotebookLM for context
 * - Quality checks between iterations
 * - Progressive refinement with checkpointing
 *
 * @example
 * ```typescript
 * const instance = await env.AI_GENERATION_WORKFLOW.create({
 *   params: {
 *     userId: "user-123",
 *     prompt: "Write a professional resume summary for a senior software engineer",
 *     maxIterations: 3,
 *     notebookContext: true
 *   }
 * });
 * ```
 */
export class AIContentGenerationWorkflow extends WorkflowEntrypoint<
  Env,
  AIContentGenerationParams
> {
  async run(event: WorkflowEvent<AIContentGenerationParams>, step: WorkflowStep) {
    const { userId, prompt, targetDocId, maxIterations, notebookContext } = event.payload;

    // Step 1: Gather context from NotebookLM if enabled
    let context = "";
    if (notebookContext) {
      context = await step.do("gather NotebookLM context", async () => {
        const result = await consultNotebook(this.env, prompt);
        return result.answer;
      });
    }

    // Step 2: Iterative generation and refinement
    let currentDraft = "";
    let qualityScore = 0;

    for (let i = 0; i < maxIterations; i++) {
      const iteration = i + 1;

      const result = await step.do(
        `generate content iteration ${iteration}`,
        {
          retries: {
            limit: 2,
            delay: "5 seconds",
            backoff: "exponential",
          },
        },
        async () => {
          const provider = getProvider(this.env);
          const model = getModelRegistry(this.env).chat;

          const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            {
              role: "system",
              content:
                "You are a professional content writer. Create high-quality, engaging content based on the user's request.",
            },
          ];

          if (context) {
            messages.push({
              role: "system",
              content: `Additional context from knowledge base:\n${context}`,
            });
          }

          if (currentDraft && iteration > 1) {
            messages.push({
              role: "user",
              content: `Previous draft:\n${currentDraft}\n\nPlease improve this draft based on the original request: ${prompt}`,
            });
          } else {
            messages.push({
              role: "user",
              content: prompt,
            });
          }

          const generationResult = await provider.invokeModel(model, {
            messages,
            temperature: 0.7,
            max_tokens: 1000,
          });

          return generationResult.response;
        },
      );

      currentDraft = result;

      // Step 3: Quality check
      qualityScore = await step.do(`quality check iteration ${iteration}`, async () => {
        // Mock quality scoring - in production, use AI to evaluate
        const length = currentDraft.length;
        const hasStructure = currentDraft.includes("\n\n");
        const baseScore = Math.min(100, (length / 500) * 50 + (hasStructure ? 50 : 0));

        return Math.floor(baseScore);
      });

      // If quality is good enough, break early
      if (qualityScore >= 85) {
        break;
      }

      // Sleep between iterations to avoid rate limits
      if (iteration < maxIterations) {
        await step.sleep(`pause between iterations`, "2 seconds");
      }
    }

    // Step 4: Save to Google Doc if targetDocId provided
    if (targetDocId) {
      await step.do("save to Google Doc", async () => {
        const docsClient = new GoogleDocsClient(this.env);
        await docsClient.appendText(targetDocId, `\n\n${currentDraft}`);
        return { saved: true, docId: targetDocId };
      });
    }

    // Step 5: Store in R2 as backup
    await step.do("backup to R2", async () => {
      const backupKey = `users/${userId}/ai-content/${Date.now()}.txt`;
      await this.env.R2_FILES_BUCKET.put(backupKey, currentDraft, {
        customMetadata: {
          userId,
          prompt: prompt.slice(0, 100),
          qualityScore: qualityScore.toString(),
          iterations: maxIterations.toString(),
        },
      });

      return { backupKey };
    });

    return {
      success: true,
      userId,
      content: currentDraft,
      qualityScore,
      iterations: Math.min(maxIterations, qualityScore >= 85 ? maxIterations - 1 : maxIterations),
      timestamp: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Workflow Configuration Example
// ---------------------------------------------------------------------------

/**
 * Example wrangler.jsonc configuration for these workflows:
 *
 * ```jsonc
 * {
 *   "workflows": [
 *     {
 *       "name": "document-processing-workflow",
 *       "binding": "DOCUMENT_WORKFLOW",
 *       "class_name": "DocumentProcessingWorkflow"
 *     },
 *     {
 *       "name": "approval-workflow",
 *       "binding": "APPROVAL_WORKFLOW",
 *       "class_name": "ApprovalWorkflow"
 *     },
 *     {
 *       "name": "ai-generation-workflow",
 *       "binding": "AI_GENERATION_WORKFLOW",
 *       "class_name": "AIContentGenerationWorkflow"
 *     }
 *   ]
 * }
 * ```
 */

// ---------------------------------------------------------------------------
// Usage from API Routes
// ---------------------------------------------------------------------------

/**
 * Example API route handlers for starting and managing workflows.
 */

/**
 * Start a document processing workflow.
 *
 * POST /api/workflows/document-processing
 * Body: { userId, docId, operations, requiresApproval }
 */
export async function startDocumentProcessing(
  env: Env,
  params: DocumentProcessingParams,
): Promise<{ workflowId: string; status: string }> {
  const instance = await env.DOCUMENT_WORKFLOW.create({ params });

  return {
    workflowId: instance.id,
    status: "started",
  };
}

/**
 * Check workflow status.
 *
 * GET /api/workflows/:workflowId/status
 */
export async function getWorkflowStatus(
  env: Env,
  workflowId: string,
): Promise<{ status: string; output?: unknown }> {
  const instance = await env.DOCUMENT_WORKFLOW.get(workflowId);
  const status = await instance.status();

  return {
    status: status.status,
    output: status.output,
  };
}

/**
 * Send an event to a waiting workflow.
 *
 * POST /api/workflows/:workflowId/events/:eventName
 * Body: { ...event data }
 */
export async function sendWorkflowEvent(
  env: Env,
  workflowId: string,
  eventName: string,
  eventData: unknown,
): Promise<{ sent: boolean }> {
  const instance = await env.DOCUMENT_WORKFLOW.get(workflowId);
  await instance.sendEvent(eventName, eventData);

  return { sent: true };
}
