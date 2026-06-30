/**
 * @fileoverview Live interactive panel for the `mcp-agent`.
 *
 * Surfaces the agent's MCP-style tool registry three ways:
 *  - a live catalog from the `@callable listTools()` RPC
 *    (`[{ name, description, inputShape }]`);
 *  - a "call tool" form that invokes `@callable callTool(name, input)` and
 *    shows the real result;
 *  - a chat thread where the model can call `echo` / `currentTime` / `dbCount`.
 *
 * Mounted with `client:only="react"` — browser-only agents stack.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { AgentThread, statusFromReadyState } from "./AgentThread";
import { ConnectionBadge, EmptyState, ErrorBanner, LoadingRow, useSessionId } from "./shared";

/** Descriptor returned by the agent's `listTools()` RPC. */
interface ToolDescriptor {
  name: string;
  description: string;
  inputShape?: unknown;
}

/** MCP showcase: tool catalog + call form + chat. */
export function McpPanel() {
  const sessionId = useSessionId("mcp");
  const agent = useAgent({ agent: "mcp-agent", name: sessionId });
  const chat = useAgentChat({ agent });
  const runtime = useAISDKRuntime(chat);
  const status = statusFromReadyState(agent.readyState);

  const [tools, setTools] = useState<ToolDescriptor[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string>("");
  const [input, setInput] = useState<string>("{}");
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<unknown>(undefined);

  /** Load the tool catalog from the agent. */
  const loadTools = useCallback(async () => {
    if (agent.readyState !== 1) return;
    setLoadingTools(true);
    setCatalogError(null);
    try {
      const res = await agent.call<ToolDescriptor[]>("listTools");
      const list = Array.isArray(res) ? res : [];
      setTools(list);
      // Auto-select the first tool only if nothing is selected yet.
      setSelected((prev) => prev || (list[0]?.name ?? ""));
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Failed to load tools.");
    } finally {
      setLoadingTools(false);
    }
  }, [agent]);

  useEffect(() => {
    if (status === "connected") void loadTools();
  }, [status, loadTools]);

  /** Invoke the selected tool with the JSON input. */
  async function callTool() {
    if (!selected) return;
    setCalling(true);
    setCallError(null);
    setCallResult(undefined);
    let parsed: unknown = {};
    try {
      parsed = input.trim() ? JSON.parse(input) : {};
    } catch {
      setCallError("Input must be valid JSON.");
      setCalling(false);
      return;
    }
    try {
      const res = await agent.call("callTool", [selected, parsed]);
      setCallResult(res);
    } catch (err) {
      setCallError(err instanceof Error ? err.message : "Tool call failed.");
    } finally {
      setCalling(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Catalog + call */}
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <div>
              <CardTitle>Tool catalog</CardTitle>
              <CardDescription>Live from <code className="text-primary">listTools()</code></CardDescription>
            </div>
            <ConnectionBadge status={status} sessionId={sessionId} />
          </CardHeader>
          <CardContent className="space-y-3">
            <ErrorBanner message={catalogError} />
            {loadingTools && tools.length === 0 ? (
              <LoadingRow label="Loading tools…" />
            ) : tools.length === 0 ? (
              <EmptyState label="No tools reported by the agent." />
            ) : (
              <ul className="divide-y divide-border/40">
                {tools.map((tool) => (
                  <li key={tool.name}>
                    <button
                      type="button"
                      onClick={() => setSelected(tool.name)}
                      className={`flex w-full flex-col items-start gap-1 py-2.5 text-left transition-colors ${
                        selected === tool.name ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-semibold text-primary">{tool.name}</code>
                        {selected === tool.name && <Badge variant="secondary">selected</Badge>}
                      </div>
                      <p className="text-xs">{tool.description}</p>
                      {tool.inputShape !== undefined && (
                        <code className="text-[10px] text-muted-foreground">
                          {JSON.stringify(tool.inputShape)}
                        </code>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Call a tool</CardTitle>
            <CardDescription>
              Invokes <code className="text-primary">callTool({selected || "name"}, input)</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              spellCheck={false}
              className="min-h-20 font-mono text-xs"
              aria-label="Tool input JSON"
            />
            <Button size="sm" onClick={callTool} disabled={calling || !selected || status !== "connected"}>
              {calling ? "Calling…" : "Call tool"}
            </Button>
            <ErrorBanner message={callError} />
            {callResult !== undefined && (
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">Result</p>
                <pre className="overflow-x-auto rounded bg-muted/40 p-2 text-[11px] leading-relaxed text-emerald-300">
                  <code>{JSON.stringify(callResult, null, 2)}</code>
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat */}
      <Card className="flex h-[36rem] flex-col">
        <CardHeader className="pb-3">
          <CardTitle>Chat over MCP tools</CardTitle>
          <CardDescription>
            The model can call <code className="text-primary">echo</code>,{" "}
            <code className="text-primary">currentTime</code>,{" "}
            <code className="text-primary">dbCount</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <AgentThread runtime={runtime} placeholder="e.g. what time is it? how many rows in the db?" />
        </CardContent>
      </Card>
    </div>
  );
}
