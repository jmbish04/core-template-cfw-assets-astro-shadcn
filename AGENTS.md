# Agent Workspace Overview

Welcome to the `core-template-cfw-assets-astro-shadcn` template. This is a unified full-stack template combining Cloudflare Workers (Backend & Assets) with Astro and React + Shadcn/ui (Frontend).

## Core Architecture
- **Backend:** Cloudflare Workers, Hono (Routing), D1 (Database with Drizzle ORM).
- **Frontend:** Astro (SSR/Static Hybrid), React (Interactive Islands), Tailwind CSS, Shadcn/ui.
- **Deployment:** Deployed using Cloudflare Workers Assets via `wrangler.jsonc`.

## Mandatory Agent Directives
This repository relies heavily on AI agents for rapid prototyping and feature generation. If you are an AI agent, you must strictly follow these directives:

1. **Read Startup Rules:** Immediately review `.agent/rules/startup.md` before writing any code. It contains critical instructions for your first steps.
2. **Clean State Execution:** The template's default UI has been deliberately wiped clean to provide you with a blank canvas. Start implementing the user's desired logic immediately in `src/frontend/pages/index.astro`. Do not restore placeholder cards or github header links.
3. **Environment Strictness:** We use `worker-configuration.d.ts` for Cloudflare types. Never manually define `interface Bindings`. Always use `Bindings: Env` on Hono applications.
4. **Package Management:** Default to `pnpm` for package installation and script execution.
