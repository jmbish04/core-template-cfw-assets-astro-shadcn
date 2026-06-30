/**
 * @fileoverview Multi-thread assistant-ui runtime wired to the ChatBroker DO.
 *
 * ## Path shipped: REAL per-thread Cloudflare Agent
 *
 * We use `useRemoteThreadListRuntime({ adapter: InMemoryThreadListAdapter, runtimeHook })`.
 * The thread LIST (create / switch / archive / delete / titles) lives in memory
 * on the client via `InMemoryThreadListAdapter`. The MESSAGES for each thread
 * live server-side: `runtimeHook` connects the *currently active* thread to its
 * own `ChatBroker` Durable Object instance.
 *
 * The key mechanic: `useRemoteThreadListRuntime` renders `runtimeHook` once per
 * active thread, each inside a `ThreadListItemRuntimeProvider`. So inside the
 * hook we read the active thread's stable local id via
 * `useThreadListItem((s) => s.id)` and pass it as the `name` to
 * `useAgent({ agent: "chat-broker", name: threadId })`. Because each distinct
 * `name` is a distinct DO instance (keyed by `idFromName`), each thread is a
 * distinct, server-persisted conversation. Switching threads in the list
 * remounts the hook with a different id → reconnects to that DO → its history
 * rehydrates. (Verified against the 0.12.28 `RemoteThreadListHookInstanceManager`
 * which wraps each active thread's `runtimeHook` in a `ThreadListItemRuntimeProvider`.)
 *
 * No backend changes were needed for multi-thread: the ChatBroker already keys
 * persistence by `name`. The InMemoryThreadListAdapter is intentionally
 * client-side — the thread list is ephemeral per browser session, while the
 * conversations themselves are durable. (A future enhancement could persist the
 * list via a custom `RemoteThreadListAdapter` backed by a DO; out of scope here.)
 *
 * Browser-only: consumers mount `client:only="react"`.
 */

"use client";

import { type PropsWithChildren } from "react";

import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";

import {
  AssistantRuntimeProvider,
  InMemoryThreadListAdapter,
  useRemoteThreadListRuntime,
  useThreadListItem,
  type AssistantRuntime,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";

/**
 * Per-thread runtime hook. Called once per active thread by
 * `useRemoteThreadListRuntime`, inside that thread's
 * `ThreadListItemRuntimeProvider`, so `useThreadListItem` resolves the active
 * thread's id here.
 *
 * The id is used as the ChatBroker DO `name`, making each thread a distinct,
 * server-persisted conversation.
 */
function useChatBrokerThreadRuntime(): AssistantRuntime {
  // Stable local thread id from the InMemoryThreadListAdapter. This is the DO
  // routing key. Falls back to a constant before the provider resolves (which
  // only happens on the very first commit of a brand-new thread).
  const threadId = useThreadListItem((s) => s.id) || "chat-broker-default";

  const agent = useAgent({ agent: "chat-broker", name: threadId });
  const chat = useAgentChat({ agent });
  // `useAISDKRuntime` returns an `AssistantRuntime` typed against a slightly
  // older `@assistant-ui/core` than the one `useRemoteThreadListRuntime`
  // consumes (the same benign skew bridged in `AgentChat.tsx`). The cast keeps
  // the structurally-identical runtimes converging.
  return useAISDKRuntime(chat) as unknown as AssistantRuntime;
}

/**
 * Provider mounting the multi-thread runtime. Wrap the workspace
 * (`ThreadList` + `Thread`) with this so both the list and the active thread
 * share one runtime.
 */
export function MultiThreadRuntimeProvider({ children }: PropsWithChildren) {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useChatBrokerThreadRuntime,
    adapter: new InMemoryThreadListAdapter(),
  });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
