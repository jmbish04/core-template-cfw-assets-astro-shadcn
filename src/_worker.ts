/**
 * @fileoverview Cloudflare Workers entry point
 *
 * This file integrates the Hono API with Astro SSR.
 */

import type { ExportedHandler } from '@cloudflare/workers-types';
import { app as honoApp } from './backend/api/index';
import { OrchestratorAgent } from "./backend/ai/agents/orchestrator";
import { NotebookLMAgent } from "./backend/ai/agents/notebooklm";

const handler: ExportedHandler<Env> = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (
      url.pathname.startsWith('/api/') ||
      url.pathname === '/openapi.json' ||
      url.pathname === '/swagger' ||
      url.pathname === '/scalar' ||
      url.pathname === '/scaler' ||
      url.pathname === '/docs'
    ) {
      return honoApp.fetch(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

export default handler;

export OrchestratorAgent, NotebookLMAgent;
