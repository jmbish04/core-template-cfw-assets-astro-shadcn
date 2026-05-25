/**
 * @fileoverview Cloudflare Workers entry point
 *
 * This file integrates the Hono API with Astro SSR and exports all Durable Object agents.
 */

import type { ExportedHandler } from "@cloudflare/workers-types";

import { NotebookLMAgent } from "./backend/ai/agents/notebooklm";
import { OrchestratorAgent } from "./backend/ai/agents/orchestrator";
import { GoogleDocsAgent } from "./backend/ai/agents/google-docs";
import { app as honoApp } from "./backend/api/index";

const handler: ExportedHandler<Env> = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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

    return env.ASSETS.fetch(request);
  },
};

export default handler;

// Export all Durable Object agent classes (required by wrangler.jsonc)
export { OrchestratorAgent, NotebookLMAgent, GoogleDocsAgent };

