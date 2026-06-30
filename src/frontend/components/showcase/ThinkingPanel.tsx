/**
 * @fileoverview Live interactive panel for the `thinking-agent`.
 *
 * The agent's `onChatMessage` emits `reasoning` parts before the final `text`
 * parts. We render the reasoning trace in a distinct, collapsible "Thinking"
 * block ABOVE the answer by supplying a custom `Reasoning` component to the
 * shared {@link AgentThread} (which maps it onto `MessagePrimitive.Parts`'s
 * `Reasoning` slot). Text parts render normally below.
 *
 * Mounted with `client:only="react"` — browser-only agents stack.
 */

"use client";

import { useState, type FC } from "react";

import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import type { ReasoningMessagePartProps } from "@assistant-ui/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { AgentThread, statusFromReadyState } from "./AgentThread";
import { ConnectionBadge, useSessionId } from "./shared";

/**
 * Collapsible reasoning block. Open while the part is still streaming so the
 * trace is visible live, collapsible once complete to keep the answer clean.
 */
const ThinkingTrace: FC<ReasoningMessagePartProps> = ({ text, status }) => {
  const streaming = status?.type === "running";
  return (
    <details
      open={streaming}
      className="group/think mb-2 rounded-md bg-muted/30 ring-1 ring-border/40"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground select-none">
        <span className="inline-block size-1.5 rounded-full bg-primary/70 group-open/think:bg-primary" />
        {streaming ? "Thinking…" : "Thinking"}
        <span className="ml-auto text-[10px] tracking-wide uppercase opacity-70 group-open/think:hidden">
          show
        </span>
      </summary>
      <div className="border-t border-border/40 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground italic">
        {text}
      </div>
    </details>
  );
};

/** Thinking showcase: a chat that surfaces the reasoning trace separately. */
export function ThinkingPanel() {
  const sessionId = useSessionId("thinking");
  const agent = useAgent({ agent: "thinking-agent", name: sessionId });
  const chat = useAgentChat({ agent });
  const runtime = useAISDKRuntime(chat);
  const status = statusFromReadyState(agent.readyState);

  // Surface whether the current turn is mid-stream for the header hint.
  const [hint] = useState(
    "The model streams its reasoning first, then the answer. The trace is collapsible.",
  );

  return (
    <Card className="flex h-[calc(100vh-18rem)] min-h-[32rem] flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle>Reasoning trace</CardTitle>
          <CardDescription>{hint}</CardDescription>
        </div>
        <ConnectionBadge status={status} sessionId={sessionId} />
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <AgentThread
          runtime={runtime}
          reasoning={ThinkingTrace}
          placeholder="Ask something that needs reasoning…"
          emptyLabel="Ask a question — you'll see the thinking trace, then the answer."
        />
      </CardContent>
    </Card>
  );
}
