# Agent Startup Rules for Core Template (CFW + Astro + Shadcn)

This document provides mandatory startup rules and conformance standards for any AI agent working within this template (`core-template-cfw-assets-astro-shadcn`).

## 1. First Turn Actions
When starting a new feature or project using this template, your **first step** is to:
1. Open `src/frontend/pages/index.astro`.
2. Clear out the blank slate instructional comments.
3. Immediately begin implementing the user's requested frontend layout directly into this file (or the appropriate routing structure). Do not search for or try to restore old template placeholders.

## 2. Environment Variables & Bindings
- **Strict Typing:** You must use the global `Env` type automatically generated in `worker-configuration.d.ts` (configured via `tsconfig.json`).
- **Hono Bindings Rule:** Defining a custom `interface Bindings { ... }` in your code is **NEVER ACCEPTABLE**.
- **Correct Usage:** ALWAYS type Hono instances using the global `Env`:
  ```typescript
  import { Hono } from 'hono';
  
  // ✅ DO THIS
  const app = new Hono<{ Bindings: Env }>();
  
  // ❌ NEVER DO THIS
  // interface Bindings { MY_KV: KVNamespace }
  // const app = new Hono<{ Bindings: Bindings }>();
  ```

## 3. Frontend Conformance
- **Path structure:** All Astro, React, and UI code lives in `src/frontend/`.
- **UI Components:** Use the existing `shadcn/ui` components in `src/frontend/components/ui/`. If a component is missing, use the Shadcn CLI to add it or refer to the appropriate project rules.
- **Styling:** Use Tailwind CSS and ensure compatibility with the project's design system. Avoid generic inline styles when a proper utility or token exists.

## 4. Deployment Context
- This project deploys to Cloudflare Workers using Astro's Cloudflare adapter mapped via Workers Assets.
- Ensure that backend endpoints and frontend assets cleanly interact and share the `Env` bindings without duplication.

## 5. Dependency and CI Maintenance
- Follow `.agent/rules/dependency-maintenance.md` whenever you touch dependencies, Wrangler config, or generated Cloudflare types.
- Use Node.js 22+ for any workflow that runs Wrangler, including `pnpm run cf-typegen`, `deps:lockfile`, and `deps:update`.
- If GitHub Actions or Cloudflare deployment checks fail because the pnpm lockfile is frozen/out of date, Wrangler is stale, or generated types drifted, run:
  1. `corepack pnpm run deps:lockfile`
  2. `corepack pnpm run deps:update` when versions are outdated and the lockfile refresh alone is not enough
  3. switch to Node.js 22+ if Wrangler reports a Node version error
  4. `corepack pnpm lint`
  5. `corepack pnpm build`
- Commit `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` when touched, and `worker-configuration.d.ts` when regenerated. Do not add `package-lock.json`.
