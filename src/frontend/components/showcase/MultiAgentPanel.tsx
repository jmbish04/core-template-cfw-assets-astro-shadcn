/**
 * @fileoverview Live interactive panel for the multi-agent orchestration demo.
 *
 * The `orchestrator-agent` is an RPC agent (no chat surface). We:
 *  - call its `@callable delegate("research" | "code", task)` RPC and render
 *    the REAL `{ agentType, instance, taskId, status, output?, error?,
 *    durationMs }` result, visualising which subagent ran;
 *  - call `getStats()` to show aggregate delegation counts.
 *
 * The `researcher-agent` / `coder-agent` instances do the actual work server
 * side and keep `{ totalTasks, lastTask, busy }` state; the orchestrator's
 * response is what we surface here.
 *
 * Mounted with `client:only="react"` — browser-only agents stack.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import { useAgent } from "agents/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { statusFromReadyState } from "./AgentThread";
import { ConnectionBadge, EmptyState, ErrorBanner, LoadingRow, useSessionId } from "./shared";

/** A delegation kind the orchestrator understands. */
type DelegateKind = "research" | "code";

/** Shape returned by the orchestrator's `delegate` RPC. */
interface DelegationResult {
  agentType: string;
  instance: string;
  taskId: string;
  status: string;
  output?: unknown;
  error?: string;
  durationMs: number;
}

/** Aggregate stats from the orchestrator's `getStats` RPC. */
interface OrchestratorStats {
  totalDelegations?: number;
  research?: number;
  code?: number;
  [key: string]: number | undefined;
}

const SAMPLE_TASKS: Record<DelegateKind, string> = {
  research: "Summarise the tradeoffs of Durable Objects vs KV for session state.",
  code: "Write a TypeScript function that debounces an async callback.",
};

/** Multi-agent showcase: delegate tasks and visualise which subagent ran. */
export function MultiAgentPanel() {
  const sessionId = useSessionId("multi-agent");
  const agent = useAgent({ agent: "orchestrator-agent", name: sessionId });
  const status = statusFromReadyState(agent.readyState);

  const [kind, setKind] = useState<DelegateKind>("research");
  const [task, setTask] = useState(SAMPLE_TASKS.research);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DelegationResult[]>([]);
  const [stats, setStats] = useState<OrchestratorStats | null>(null);

  /** Pull aggregate stats from the orchestrator. */
  const refreshStats = useCallback(async () => {
    if (agent.readyState !== 1) return;
    try {
      const res = await agent.call<OrchestratorStats>("getStats");
      setStats(res ?? null);
    } catch {
      // Stats are non-critical; ignore transient errors.
    }
  }, [agent]);

  useEffect(() => {
    if (status === "connected") void refreshStats();
  }, [status, refreshStats]);

  /** Switch the delegation kind and load its sample task. */
  function pickKind(next: DelegateKind) {
    setKind(next);
    setTask(SAMPLE_TASKS[next]);
  }

  /** Delegate the current task and prepend the result to the history. */
  async function delegate() {
    if (!task.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await agent.call<DelegationResult>("delegate", [kind, task]);
      setHistory((prev) => [res, ...prev]);
      void refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delegation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Delegate */}
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div>
            <CardTitle>Delegate a task</CardTitle>
            <CardDescription>
              The orchestrator routes to a <code className="text-primary">researcher</code> or{" "}
              <code className="text-primary">coder</code> subagent.
            </CardDescription>
          </div>
          <ConnectionBadge status={status} sessionId={sessionId} />
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <div className="flex gap-2">
            {(["research", "code"] as const).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={kind === k ? "default" : "outline"}
                onClick={() => pickKind(k)}
              >
                {k}
              </Button>
            ))}
          </div>
          <Textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={4}
            className="min-h-24 text-sm"
            aria-label="Task to delegate"
          />
          <Button size="sm" onClick={delegate} disabled={busy || status !== "connected"}>
            {busy ? "Delegating…" : `Delegate to ${kind} agent`}
          </Button>

          <ErrorBanner message={error} />

          {stats && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(stats).map(([key, value]) =>
                value === undefined ? null : (
                  <Badge key={key} variant="secondary">
                    {key}: {value}
                  </Badge>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delegation visual */}
      <Card className="flex h-[34rem] flex-col">
        <CardHeader className="pb-3">
          <CardTitle>Delegation results</CardTitle>
          <CardDescription>Which subagent ran, its output, and how long it took.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {busy && history.length === 0 && <LoadingRow label="Waiting for the subagent…" />}
          {history.length === 0 && !busy ? (
            <EmptyState label="No delegations yet. Send a task to see the routing in action." />
          ) : (
            history.map((r) => (
              <div key={r.taskId} className="rounded-md bg-background/60 p-3 ring-1 ring-border/40">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="default">{r.agentType}</Badge>
                    <code className="text-muted-foreground">{r.instance}</code>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] tracking-wide uppercase">
                    <span className={r.status === "error" ? "text-destructive" : "text-emerald-400"}>
                      {r.status}
                    </span>
                    <span className="text-muted-foreground">{r.durationMs}ms</span>
                  </div>
                </div>
                <pre className="overflow-x-auto rounded bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                  <code>
                    {r.status === "error"
                      ? r.error
                      : typeof r.output === "string"
                        ? r.output
                        : JSON.stringify(r.output, null, 2)}
                  </code>
                </pre>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
