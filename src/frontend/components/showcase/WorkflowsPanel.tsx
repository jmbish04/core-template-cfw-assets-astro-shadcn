/**
 * @fileoverview Live interactive panel for the `workflows-agent`.
 *
 * Demonstrates server-driven progress streaming: we subscribe to the agent's
 * state via `useAgent({ onStateUpdate })` and render a LIVE progress bar +
 * step label that updates as the Durable Object pushes
 * `{ activeWorkflow, lastProgress: { step, percent, message? } }`.
 *
 * The chat thread drives the workflow tools (`transcribeAudio`, `processData`).
 * A manual "Check progress" button calls the `@callable getWorkflowProgress(id)`
 * RPC as a fallback / on-demand poll.
 *
 * Mounted with `client:only="react"` — browser-only agents stack.
 */

"use client";

import { useState } from "react";

import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { AgentThread, statusFromReadyState } from "./AgentThread";
import { ConnectionBadge, EmptyState, ErrorBanner, useSessionId } from "./shared";

/** Progress payload the workflows-agent broadcasts on each step. */
interface WorkflowProgress {
  step: string;
  percent: number;
  message?: string;
}

/** Full state shape streamed from the workflows-agent Durable Object. */
interface WorkflowsState {
  activeWorkflow?: string | null;
  lastProgress?: WorkflowProgress | null;
}

/**
 * Workflows showcase: a live progress stepper bound to `onStateUpdate`, plus a
 * chat that drives the workflow tools.
 */
export function WorkflowsPanel() {
  const sessionId = useSessionId("workflows");
  const [state, setState] = useState<WorkflowsState>({});
  const [error, setError] = useState<string | null>(null);

  const agent = useAgent<WorkflowsState>({
    agent: "workflows-agent",
    name: sessionId,
    onStateUpdate: (next) => setState(next ?? {}),
  });
  const chat = useAgentChat({ agent });
  const runtime = useAISDKRuntime(chat);
  const status = statusFromReadyState(agent.readyState);

  const progress = state.lastProgress;
  const active = state.activeWorkflow;

  /** On-demand poll of the active workflow's progress via RPC. */
  async function refreshProgress() {
    if (!active) return;
    setError(null);
    try {
      const res = await agent.call<WorkflowProgress>("getWorkflowProgress", [active]);
      setState((prev) => ({ ...prev, lastProgress: res }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read workflow progress.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Live progress */}
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div>
            <CardTitle>Live workflow progress</CardTitle>
            <CardDescription>
              Streamed from the Durable Object via <code className="text-primary">onStateUpdate</code>.
            </CardDescription>
          </div>
          <ConnectionBadge status={status} sessionId={sessionId} />
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          {active ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <code className="text-primary">{active}</code>
                <span className="text-muted-foreground tabular-nums">
                  {Math.round(progress?.percent ?? 0)}%
                </span>
              </div>
              <Progress value={Math.round(progress?.percent ?? 0)} />
              <div className="rounded-md bg-muted/30 px-3 py-2 text-xs ring-1 ring-border/40">
                <p className="font-medium">{progress?.step ?? "Starting…"}</p>
                {progress?.message && (
                  <p className="mt-1 text-muted-foreground">{progress.message}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshProgress}
                disabled={status !== "connected"}
              >
                Check progress
              </Button>
            </div>
          ) : (
            <EmptyState label="No active workflow. Ask the agent to transcribe audio or process data to kick one off." />
          )}

          <ErrorBanner message={error} />
        </CardContent>
      </Card>

      {/* Chat */}
      <Card className="flex h-[32rem] flex-col">
        <CardHeader className="pb-3">
          <CardTitle>Drive a workflow</CardTitle>
          <CardDescription>
            Tools: <code className="text-primary">transcribeAudio</code>,{" "}
            <code className="text-primary">processData</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <AgentThread
            runtime={runtime}
            placeholder="e.g. process this dataset of 1,000 rows…"
            emptyLabel="Start a workflow — progress streams to the left."
          />
        </CardContent>
      </Card>
    </div>
  );
}
