/**
 * @fileoverview Cloudflare Workers entry point for Astro SSR with Durable Objects
 *
 * This file integrates the Hono API with Astro SSR and exports Durable Object agents.
 * The createExports function is required by the Astro Cloudflare adapter.
 */

import type { ExportedHandler } from "@cloudflare/workers-types";
import { routeAgentRequest } from "agents";
import { app as honoApp } from "./backend/api/index";

// Import Durable Object classes (the Agents SDK showcase agents)
import { CodeModeAgent } from "./backend/ai/agents/CodeModeAgent";
import { BrowserHitlAgent } from "./backend/ai/agents/BrowserHitlAgent";
import { WorkflowsAgent } from "./backend/ai/agents/WorkflowsAgent";
import { ArtifactAgent } from "./backend/ai/agents/ArtifactAgent";
import { ChatBroker } from "./backend/ai/agents/ChatBroker";
import { NotificationsAgent } from "./backend/ai/agents/NotificationsAgent";

// Re-export Durable Object classes
export {
  CodeModeAgent,
  BrowserHitlAgent,
  WorkflowsAgent,
  ArtifactAgent,
  ChatBroker,
  NotificationsAgent,
};

/**
 * Create exports function required by Astro Cloudflare adapter
 *
 * This function is called by Astro's generated worker to create the final exports
 * including both the Astro SSR handler and our Durable Object classes.
 */
export function createExports(manifest: any, _args: any) {
  // NOTE: `request as any` at the call sites bridges the lib.dom (Hono) vs
  // @cloudflare/workers-types (agents / ASSETS) `Request` type friction; the
  // object is cast to `ExportedHandler<Env>` for the same reason.
  const handler = {
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
      const url = new URL(request.url);

      // Route agent WebSocket/HTTP connections via the Agents SDK router.
      // Matches /agents/:agent-name/:instance-name.
      if (url.pathname.startsWith("/agents/")) {
        const agentResponse = await routeAgentRequest(request as any, env);
        if (agentResponse) return agentResponse;
      }

      // Route API and documentation endpoints to Hono
      if (
        url.pathname.startsWith("/api/") ||
        url.pathname === "/openapi.json" ||
        url.pathname === "/swagger" ||
        url.pathname === "/scalar" ||
        url.pathname === "/scaler" ||
        url.pathname === "/docs"
      ) {
        return honoApp.fetch(request as any, env, ctx);
      }

      // Delegate to Astro SSR via ASSETS binding
      return env.ASSETS.fetch(request as any);
    },
  } as unknown as ExportedHandler<Env>;

  return {
    default: handler,
    // Export Durable Object classes
    CodeModeAgent,
    BrowserHitlAgent,
    WorkflowsAgent,
    ArtifactAgent,
    ChatBroker,
    NotificationsAgent,
  };
}

/**
 * Default export for standalone worker usage (non-Astro)
 */
const handler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Route API and documentation endpoints to Hono
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname === "/openapi.json" ||
      url.pathname === "/swagger" ||
      url.pathname === "/scalar" ||
      url.pathname === "/scaler" ||
      url.pathname === "/docs"
    ) {
      return honoApp.fetch(request as any, env, ctx);
    }

    // Delegate to Astro SSR via ASSETS binding
    return env.ASSETS.fetch(request as any);
  },
} as unknown as ExportedHandler<Env>;

export default handler;
