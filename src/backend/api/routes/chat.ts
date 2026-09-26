/**
 * @fileoverview Chat send/receive REST API — `POST /api/chat`.
 *
 * The single chat endpoint for this template: creates a thread on first
 * message if needed, persists the user turn, calls `guardianChat` (which
 * routes through the `CORE_GUARDIAN` service binding — see
 * `backend/ai/guardian.ts`), persists the assistant reply, and returns it.
 *
 * There is no Durable Object / Agents SDK broker here; everything is plain
 * D1 reads/writes plus one RPC call.
 *
 * Mount this router at `/api/chat` in `api/index.ts`.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { asc, eq } from "drizzle-orm";

import { getDb } from "../../db";
import { chatThreads, chatMessages, selectChatMessageSchema } from "../../db/schema";
import { guardianChat, GuardianError } from "../../ai/guardian";

const CHAT_SYSTEM_PROMPT =
  "You are a concise, helpful assistant embedded in a project management dashboard template. Keep replies short and to the point.";

/** How many recent messages (of either role) to send as context. */
const CONTEXT_TURNS = 20;

const chatBody = z
  .object({
    threadId: z.string().min(1).optional(),
    message: z.string().min(1).max(8000),
  })
  .openapi("ChatBody");

const chatResponse = z.object({
  threadId: z.string(),
  message: selectChatMessageSchema,
});

const chatErrorSchema = z.object({ error: z.string() });

export const chatRouter = new OpenAPIHono<{ Bindings: Env }>();

chatRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Chat"],
    summary: "Send a chat message; get the assistant's reply",
    operationId: "chatSend",
    request: {
      body: { content: { "application/json": { schema: chatBody } } },
    },
    responses: {
      200: {
        description: "Assistant reply, persisted.",
        content: { "application/json": { schema: chatResponse } },
      },
      422: {
        description: "No model available inside core-guardian's budget right now.",
        content: { "application/json": { schema: chatErrorSchema } },
      },
      429: {
        description: "core-guardian's circuit breaker is open.",
        content: { "application/json": { schema: chatErrorSchema } },
      },
      502: {
        description: "core-guardian call failed for another reason.",
        content: { "application/json": { schema: chatErrorSchema } },
      },
    },
  }),
  async (c) => {
    const { threadId: bodyThreadId, message } = c.req.valid("json");
    const db = getDb(c.env);
    const now = new Date();

    // 1. Resolve or create the thread.
    let threadId = bodyThreadId;
    if (threadId) {
      const [existing] = await db
        .select({ id: chatThreads.id })
        .from(chatThreads)
        .where(eq(chatThreads.id, threadId))
        .limit(1);
      if (!existing) threadId = undefined;
    }
    if (!threadId) {
      const [created] = await db
        .insert(chatThreads)
        .values({ title: message.slice(0, 60), createdAt: now, updatedAt: now })
        .returning({ id: chatThreads.id });
      threadId = created!.id;
    }

    // 2. Persist the user turn.
    await db.insert(chatMessages).values({ threadId, role: "user", content: message, createdAt: now });

    // 3. Build context from the last CONTEXT_TURNS messages (oldest first).
    const history = await db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt));
    const recent = history.slice(-CONTEXT_TURNS);

    // 4. Call core-guardian.
    let result;
    try {
      result = await guardianChat(c.env, {
        task: "chat_reply",
        useCase: "chat",
        importance: "low",
        messages: [{ role: "system", content: CHAT_SYSTEM_PROMPT }, ...recent],
      });
    } catch (err) {
      if (err instanceof GuardianError) {
        if (err.status === 422) {
          return c.json(
            { error: "No model is available inside the budget right now. Try again later." },
            422,
          );
        }
        if (err.status === 429) {
          return c.json(
            { error: "The AI router is rate-limited right now. Try again in a minute." },
            429,
          );
        }
      }
      console.error("chat guardian error:", err);
      return c.json({ error: "The AI service is temporarily unavailable." }, 502);
    }

    // 5. Persist the assistant reply, bump thread activity.
    const [assistantRow] = await db
      .insert(chatMessages)
      .values({
        threadId,
        role: "assistant",
        content: result.text,
        provider: result.provider,
        model: result.model,
        costUsd: result.costUsd,
      })
      .returning();
    await db.update(chatThreads).set({ updatedAt: new Date() }).where(eq(chatThreads.id, threadId));

    return c.json({ threadId, message: assistantRow! }, 200);
  },
);
