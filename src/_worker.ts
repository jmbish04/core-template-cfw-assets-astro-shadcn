/**
 * @fileoverview Cloudflare Workers entry point for Astro SSR with Durable Objects
 *
 * This file integrates the Hono API with Astro SSR and exports Durable Object agents.
 * The createExports function is required by the Astro Cloudflare adapter.
 */

import type { ExportedHandler } from "@cloudflare/workers-types";
import { app as honoApp } from "./backend/api/index";

// Import Durable Object classes
import { OrchestratorAgent } from "./backend/ai/agents/orchestrator";
import { NotebookLMAgent } from "./backend/ai/agents/notebooklm";
import { GoogleDocsAgent } from "./backend/ai/agents/google-docs";

// Re-export Durable Object classes
export { OrchestratorAgent, NotebookLMAgent, GoogleDocsAgent };

/**
 * Create exports function required by Astro Cloudflare adapter
 *
 * This function is called by Astro's generated worker to create the final exports
 * including both the Astro SSR handler and our Durable Object classes.
 */
export function createExports(manifest: any, _args: any) {
  const handler: ExportedHandler<Env> = {
    async fetch(request, env, ctx) {
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
        return honoApp.fetch(request, env, ctx);
      }

      // Delegate to Astro SSR via ASSETS binding
      return env.ASSETS.fetch(request);
    },
  };

  return {
    default: handler,
    // Export Durable Object classes
    OrchestratorAgent,
    NotebookLMAgent,
    GoogleDocsAgent,
  };
}

/**
 * Default export for standalone worker usage (non-Astro)
 */
const handler: ExportedHandler<Env> = {
  async fetch(request, env, ctx) {
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
      return honoApp.fetch(request, env, ctx);
    }

    // Delegate to Astro SSR via ASSETS binding
    return env.ASSETS.fetch(request);
  },
};

export default handler;
