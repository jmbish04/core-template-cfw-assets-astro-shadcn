/**
 * @fileoverview ChatBroker - State-persistent Durable Object chat broker.
 *
 * Hosts assistant-ui `<Thread />` conversations over a Cloudflare Agents SDK
 * WebSocket channel, bypassing external provider middleware. Each instance is
 * keyed by a session id (`idFromName`) and persists its message history in
 * the embedded SQLite store managed by AIChatAgent.
 *
 * Frontend pairing: `useAgentChat({ agent: "chat-broker", name: sessionId })`
 * from `agents/react`, rendered through `@assistant-ui/react` primitives.
 */

import { AIChatAgent } from "@cloudflare/ai-chat";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";

import { getProvider } from "@/backend/ai/providers";
import { getModelRegistry } from "@/backend/ai/models";

const SYSTEM_PROMPT = [
  "You are the in-app assistant for the Cloudflare Edge Showcase.",
  "Reply concisely. Prefer short paragraphs and code blocks for code.",
  "Never invent Cloudflare bindings; cite the user's wrangler.jsonc when asked.",
].join(" ");

export class ChatBroker extends AIChatAgent<Env> {
  static docsMetadata() {
    return {
      name: "ChatBroker",
      className: "ChatBroker",
      description:
        "WebSocket-native chat broker for assistant-ui `<Thread />`. Persists conversation state per session in embedded SQLite. Routes inference through the project's Workers AI provider registry.",
      docsPath: "/docs/agents/chat-broker",
      methods: [
        {
          name: "onChatMessage",
          description:
            "Streams an LLM reply for the latest user turn. Persists assistant output to the embedded conversation log on finish.",
          params: "onFinish: (result) => void",
          returns: "Response (streamed)",
        },
      ],
    };
  }

  async onChatMessage(onFinish: Parameters<AIChatAgent<Env>["onChatMessage"]>[0]) {
    const provider = getProvider(this.env) as unknown as (
      model: unknown,
    ) => Parameters<typeof streamText>[0]["model"];
    const model = getModelRegistry(this.env).chat;

    const result = streamText({
      model: provider(model),
      system: SYSTEM_PROMPT,
      messages: convertToModelMessages(this.messages as UIMessage[]),
      stopWhen: stepCountIs(8),
      onFinish,
    });

    return result.toUIMessageStreamResponse();
  }
}
