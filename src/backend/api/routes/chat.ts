/**
 * @fileoverview Chat streaming route — AI SDK v6-compatible streaming endpoint
 * for the assistant-ui frontend.
 *
 * Receives UIMessage[] from useChatRuntime, loads role context from D1,
 * calls gpt-oss-120b via AI Gateway with streaming enabled, and returns
 * a UIMessageStream-compatible response.
 */

import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { getModelRegistry } from "@/backend/ai/models";
import { enforceTokenLimit } from "@/backend/ai/utils/token-estimator";
import { getDb } from "@/backend/db";
import { messages, roles, threads, resumeBullets } from "@/backend/db/schema";

import type { AppBindings } from "..";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  threadId: z.string().optional(),
  roleId: z.string().optional(),
  system: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const chatRouter = new Hono<AppBindings>();

/**
 * POST / — Streaming chat endpoint for assistant-ui.
 *
 * Compatible with AI SDK v6's UIMessageStream format.
 * The response is a text/event-stream that emits:
 *   - 0: (text delta)
 *   - d: {"finishReason":"stop"}
 */
chatRouter.post("/", zValidator("json", ChatRequestSchema), async (c) => {
  const { messages: incomingMessages, threadId, roleId, system } = c.req.valid("json");
  const db = getDb(c.env);

  // Build system context
  const systemParts: string[] = [
    system ??
      "You are Colby, a precise career assistant. You help with job applications, resume crafting, interview preparation, and career strategy. Be concise, actionable, and evidence-based.",
  ];

  // Load role context if scoped to a role
  if (roleId) {
    const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);

    if (role) {
      systemParts.push(
        `\n## Current Role Context`,
        `Company: ${role.companyName}`,
        `Title: ${role.jobTitle}`,
        role.jobUrl ? `URL: ${role.jobUrl}` : "",
        role.roleInstructions ? `\n## Role-Specific Instructions\n${role.roleInstructions}` : "",
      );

      // Add job posting metadata if available
      const meta = role.metadata;
      if (meta) {
        const jobDesc =
          typeof meta.jobDescription === "string"
            ? meta.jobDescription
            : typeof meta.rawText === "string"
              ? meta.rawText
              : null;

        if (jobDesc) {
          enforceTokenLimit(jobDesc, 120000, "Job Description");
          systemParts.push(`\n## Job Posting\n${jobDesc}`);
        }
      }
    }
  }

  // Add resume bullets context
  const bullets = await db.select().from(resumeBullets).where(eq(resumeBullets.isActive, true));
  if (bullets.length > 0) {
    systemParts.push(
      "\n## Historical Performance Truths",
      "Use these verified accomplishments as source material:",
      ...bullets.map((b) => {
        const metric = b.impactMetric ? ` (${b.impactMetric})` : "";
        return `[${b.category}]${metric} ${b.content}`;
      }),
    );
  }

  // Build messages for the model
  const modelMessages = [
    { role: "system" as const, content: systemParts.filter(Boolean).join("\n") },
    ...incomingMessages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
  ];

  // Get the chat model from registry
  const registry = getModelRegistry(c.env);

  // Stream from Workers AI
  const stream = await c.env.AI.run(
    registry.chat.id as Parameters<typeof c.env.AI.run>[0],
    {
      messages: modelMessages,
      stream: true,
      temperature: 0.3,
      max_tokens: 4096,
    },
    { gateway: { id: c.env.AI_GATEWAY_ID } },
  );

  // Persist user message to D1 (fire and forget)
  const lastUserMsg = incomingMessages.findLast((m) => m.role === "user");
  if (lastUserMsg && threadId) {
    c.executionCtx.waitUntil(
      db
        .insert(messages)
        .values({
          id: lastUserMsg.id ?? crypto.randomUUID(),
          threadId,
          roleId: roleId ?? null,
          author: "user",
          content: lastUserMsg.content,
          format: "ai-sdk/v6",
        })
        .catch(() => {}),
    );
  }

  // Transform Workers AI SSE stream into AI SDK v6 data stream format
  const encoder = new TextEncoder();
  const transformedStream = new ReadableStream({
    async start(controller) {
      const reader = (stream as unknown as ReadableStream).getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Workers AI SSE format: data: {"response":"token"}
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.response ?? "";
              if (token) {
                fullResponse += token;
                // AI SDK v6 data stream format: 0:text
                controller.enqueue(encoder.encode(`0:${JSON.stringify(token)}\n`));
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        // Emit finish
        controller.enqueue(
          encoder.encode(
            `d:${JSON.stringify({ finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0 } })}\n`,
          ),
        );

        // Persist assistant response (fire and forget)
        if (threadId) {
          c.executionCtx.waitUntil(
            db
              .insert(messages)
              .values({
                id: crypto.randomUUID(),
                threadId,
                roleId: roleId ?? null,
                author: "agent",
                content: fullResponse,
                format: "ai-sdk/v6",
              })
              .catch(() => {}),
          );
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(encoder.encode(`3:${JSON.stringify(errorMsg)}\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(transformedStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
      "Cache-Control": "no-cache",
    },
  });
});
