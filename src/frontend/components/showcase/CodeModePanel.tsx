/**
 * @fileoverview Live interactive panel for the `code-mode-agent`.
 *
 * Two surfaces, both talking to the same Durable Object instance:
 *  1. A chat thread (the agent's `executePlan` tool renders inline).
 *  2. A code editor + "Run" button that invokes the agent's `@callable`
 *     `executeCode({ code, timeout?, allowNetwork?, compatibilityDate? })`
 *     RPC and renders the REAL `{ status, output?, error?, executionTime }`
 *     result from the V8 isolate.
 *
 * Mounted with `client:only="react"` — depends on the browser-only agents
 * stack. Handles loading / error / empty states and shows a connection badge.
 */

"use client";

import { useState } from "react";

import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { AgentThread, statusFromReadyState } from "./AgentThread";
import { ConnectionBadge, ErrorBanner, useSessionId } from "./shared";

/** Shape returned by the agent's `executeCode` callable. */
interface ExecuteCodeResult {
  status: "success" | "error";
  output?: unknown;
  error?: string;
  executionTime: number;
}

const SAMPLE_CODE = `// Runs in a sandboxed V8 isolate (no network unless allowed).
const sum = 2 + 40;
return { sum };`;

/**
 * Full code-mode showcase: editor + Run RPC on the left, assistant chat on the
 * right, both bound to one `code-mode-agent` instance.
 */
export function CodeModePanel() {
  const sessionId = useSessionId("code-mode");
  const agent = useAgent({ agent: "code-mode-agent", name: sessionId });
  const chat = useAgentChat({ agent });
  const runtime = useAISDKRuntime(chat);
  const status = statusFromReadyState(agent.readyState);

  const [code, setCode] = useState(SAMPLE_CODE);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExecuteCodeResult | null>(null);

  /** Invoke the `executeCode` callable and surface the real isolate output. */
  async function runCode() {
    setRunning(true);
    setError(null);
    try {
      const res = await agent.call<ExecuteCodeResult>("executeCode", [
        { code, timeout: 10_000, allowNetwork: false },
      ]);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute code.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Code editor + Run */}
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div>
            <CardTitle>Dynamic Worker Sandbox</CardTitle>
            <CardDescription>
              Run TypeScript in an isolated V8 Worker via the agent&rsquo;s{" "}
              <code className="text-primary">executeCode</code> RPC.
            </CardDescription>
          </div>
          <ConnectionBadge status={status} sessionId={sessionId} />
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            rows={10}
            className="min-h-48 flex-1 font-mono text-xs"
            aria-label="Code to execute"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={runCode} disabled={running || status !== "connected"}>
              {running ? "Running…" : "Run code"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              disabled={running}
            >
              Clear output
            </Button>
          </div>

          <ErrorBanner message={error} />

          {result ? (
            <div className="rounded-md bg-background/60 p-3 ring-1 ring-border/40">
              <div className="mb-2 flex items-center justify-between text-[10px] tracking-wide uppercase">
                <span className={result.status === "success" ? "text-emerald-400" : "text-destructive"}>
                  {result.status}
                </span>
                <span className="text-muted-foreground">{result.executionTime}ms</span>
              </div>
              <pre className="overflow-x-auto rounded bg-muted/40 p-2 text-[11px] leading-relaxed text-emerald-300">
                <code>
                  {result.status === "success"
                    ? JSON.stringify(result.output, null, 2)
                    : result.error}
                </code>
              </pre>
            </div>
          ) : (
            !error && (
              <p className="text-xs text-muted-foreground">
                Output from the isolate appears here. Try the sample: <code>2 + 40</code> &rarr;{" "}
                <code>{`{ "sum": 42 }`}</code>.
              </p>
            )
          )}
        </CardContent>
      </Card>

      {/* Chat */}
      <Card className="flex h-[32rem] flex-col">
        <CardHeader className="pb-3">
          <CardTitle>Plan with the agent</CardTitle>
          <CardDescription>
            Ask it to write &amp; run a plan; the <code className="text-primary">executePlan</code>{" "}
            tool renders inline.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <AgentThread runtime={runtime} placeholder="e.g. compute fib(10) and return it…" />
        </CardContent>
      </Card>
    </div>
  );
}
