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
  type UIMessage,
} from "ai";

import { getChatModel } from "@/backend/ai/providers/ai-sdk";

/**
 * System prompt built with a real multi-line template literal (never
 * `.join("\n")`) so the model receives clean, readable instructions.
 */
const SYSTEM_PROMPT = `You are the in-app assistant for the Cloudflare Edge Showcase.
Reply concisely. Prefer short paragraphs and fenced code blocks for code.
Never invent Cloudflare bindings; cite the user's wrangler.jsonc when asked.`;

export class ChatBroker extends AIChatAgent<Env> {
  /** Docs metadata consumed by the in-app `/docs/agents` viewer. */
  static docsMetadata() {
    return {
      name: "ChatBroker",
      className: "ChatBroker",
      description:
        "WebSocket-native chat broker for assistant-ui `<Thread />`. Persists conversation state per session in embedded SQLite. Routes inference through Workers AI via the project's AI SDK provider, with graceful degradation when `env.AI` is unreachable.",
      docsPath: "/docs/agents/chat-broker",
      methods: [
        {
          name: "onChatMessage",
          description:
            "Streams an LLM reply for the latest user turn. Persists assistant output to the embedded conversation log on finish. Degrades to a streamed notice if Workers AI is unreachable.",
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
