/**
 * @fileoverview ChatBroker - State-persistent Durable Object chat broker.
 *
 * Hosts assistant-ui `<Thread />` conversations over a Cloudflare Agents SDK
 * WebSocket channel, bypassing external provider middleware. Each instance is
 * keyed by a session id (`idFromName`) and persists its message history in
 * the embedded SQLite store managed by `AIChatAgent`.
 *
 * ## Wire contract (frontend pairing)
 * - `useAgent({ agent: "chat-broker", name: sessionId })` from `agents/react`
 *   opens the WebSocket to `/agents/chat-broker/<sessionId>`.
 * - `useAgentChat({ agent })` from `@cloudflare/ai-chat/react` wraps that socket
 *   and exposes an AI-SDK-compatible chat surface.
 * - `useAISDKRuntime(chat)` from `@assistant-ui/react-ai-sdk` feeds it into
 *   `<AssistantRuntimeProvider>`.
 *
 * ## Graceful degradation
 * Workers AI (`env.AI`) is a *remote* binding — in pure `wrangler dev --local`
 * it throws "Binding AI needs to be run remotely". Rather than fail silently
 * (the WebSocket closes and the Thread shows nothing), `onChatMessage` wraps the
 * model call: if `streamText` throws *synchronously* on setup we fall back to a
 * streamed plain-text notice; if it fails mid-stream the AI SDK's `onError`
 * surfaces a readable message into the UI message stream. Either way the client
 * always sees a concrete assistant turn.
 */

import { AIChatAgent } from "@cloudflare/ai-chat";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  type ToolSet,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { getChatModel } from "@/backend/ai/providers/ai-sdk";

/**
 * System prompt built with a real multi-line template literal (never
 * `.join("\n")`) so the model receives clean, readable instructions.
 *
 * The prompt explicitly advertises the two generative-UI tools so the model
 * reaches for them when the user asks for a metric or a task — that is what
 * lights up the inline tool-UI cards (`showMetric` → KPI card,
 * `createTaskDraft` → task-draft card) rendered on the client.
 */
const SYSTEM_PROMPT = `You are the in-app assistant for the Cloudflare Edge Showcase.
Reply concisely. Prefer short paragraphs and fenced code blocks for code.
Never invent Cloudflare bindings; cite the user's wrangler.jsonc when asked.

You can render rich inline UI through two tools:
- "showMetric" — call it whenever the user asks for a KPI, statistic, or number
  worth highlighting (e.g. "show me request volume"). It renders a KPI card.
- "createTaskDraft" — call it when the user wants to capture a todo, action item,
  or task. It renders an editable task-draft card.
Prefer calling a tool over describing the data in prose when one fits.`;

/**
 * Demo generative-UI tools exposed to the model. Each has a real `execute`
 * that returns structured JSON; the matching client-side `makeAssistantToolUI`
 * renderers (see `src/frontend/components/assistant/tools/`) turn that JSON into
 * Monolith-styled cards inline in the Thread.
 *
 * Keep arg + result shapes in lockstep with the client renderers — the wire
 * contract is the Zod schema below.
 */
const CHAT_TOOLS = {
  /** Render a single KPI / metric card. */
  showMetric: tool({
    description:
      "Display a single key metric (KPI) as a rich card. Use for any statistic, count, or measurement worth highlighting.",
    inputSchema: z.object({
      label: z.string().describe("Human label for the metric, e.g. 'Requests / min'."),
      value: z.string().describe("Formatted value to display, e.g. '12.4k' or '99.98%'."),
      deltaPct: z
        .number()
        .optional()
        .describe("Period-over-period change as a percentage. Positive is up, negative is down."),
      hint: z.string().optional().describe("Short supporting context shown under the value."),
    }),
    execute: async ({ label, value, deltaPct, hint }) => {
      // No external call needed — the model supplies the figures it wants to
      // surface. Echo them back as the structured result the card renders.
      return {
        label,
        value,
        deltaPct: deltaPct ?? null,
        hint: hint ?? null,
        generatedAt: new Date().toISOString(),
      };
    },
  }),

  /** Render an editable task-draft card. */
  createTaskDraft: tool({
    description:
      "Draft a task / action item as a rich card the user can review. Use when the user wants to capture a todo.",
    inputSchema: z.object({
      title: z.string().describe("Concise task title."),
      priority: z
        .enum(["low", "medium", "high"])
        .default("medium")
        .describe("Task priority."),
      notes: z.string().optional().describe("Optional supporting detail for the task."),
    }),
    execute: async ({ title, priority, notes }) => {
      return {
        id: crypto.randomUUID(),
        title,
        priority,
        notes: notes ?? null,
        status: "draft" as const,
        createdAt: new Date().toISOString(),
      };
    },
  }),
};

export class ChatBroker extends AIChatAgent<Env> {
  /** Docs metadata consumed by the in-app `/docs/agents` viewer. */
  static docsMetadata() {
    return {
      name: "ChatBroker",
      className: "ChatBroker",
      description:
        "WebSocket-native chat broker for assistant-ui `<Thread />`. Persists conversation state per session in embedded SQLite. Routes inference through Workers AI via the project's AI SDK provider, with graceful degradation when `env.AI` is unreachable. Exposes two generative-UI demo tools (`showMetric`, `createTaskDraft`) rendered as inline cards on the client.",
      docsPath: "/docs/agents/chat-broker",
      methods: [
        {
          name: "onChatMessage",
          description:
            "Streams an LLM reply for the latest user turn, with the `showMetric` and `createTaskDraft` generative-UI tools enabled (multi-step up to 8 steps). Persists assistant output to the embedded conversation log on finish. Degrades to a streamed notice if Workers AI is unreachable.",
          params: "onFinish: (result) => void",
          returns: "Response (streamed)",
        },
      ],
    };
  }

  /**
   * Stream an assistant reply for the latest user turn.
   *
   * @param onFinish - SDK finish callback that persists the assistant message.
   * @returns A streamed UI-message `Response`.
   */
  async onChatMessage(onFinish: Parameters<AIChatAgent<Env>["onChatMessage"]>[0]) {
    try {
      const result = streamText({
        model: getChatModel(this.env),
        system: SYSTEM_PROMPT,
        messages: await convertToModelMessages(this.messages as UIMessage[]),
        // Widen to `ToolSet` so `streamText` does not narrow the `onFinish`
        // callback's generic to our concrete tool map — the `AIChatAgent`
        // `onFinish` is typed against the generic `ToolSet`. Runtime behaviour
        // is identical; this only relaxes the compile-time tool-result typing.
        tools: CHAT_TOOLS as ToolSet,
        stopWhen: stepCountIs(8),
        onFinish,
        onError: (event) => {
          console.error("ChatBroker streamText error:", event.error);
        },
      });

      return result.toUIMessageStreamResponse({
        onError: (error) =>
          `The assistant could not reach Workers AI. ${
            error instanceof Error ? error.message : String(error)
          }`,
      });
    } catch (error) {
      // Synchronous setup failure (e.g. local-dev "Binding AI needs to be run
      // remotely"). Emit a real, streamed assistant turn so the Thread renders
      // a concrete message instead of a silent dead socket.
      return this.degradedResponse(error);
    }
  }

  /**
   * Build a streamed UI-message `Response` carrying a single graceful-degradation
   * notice. This keeps the assistant-ui Thread populated even when inference is
   * unavailable.
   *
   * @param error - The originating failure, surfaced verbatim for debuggability.
   */
  private degradedResponse(error: unknown): Response {
    const detail = error instanceof Error ? error.message : String(error);
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const id = crypto.randomUUID();
        writer.write({ type: "text-start", id });
        writer.write({
          type: "text-delta",
          id,
          delta: `Workers AI is currently unreachable from this environment, so I can't generate a live reply. (${detail})`,
        });
        writer.write({ type: "text-end", id });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }
}
