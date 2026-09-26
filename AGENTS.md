# AGENTS

- At the start of every turn, use the `cloudflare-docs` MCP server to verify Cloudflare assumptions, architecture, and deprecations before writing or changing code.
- Review and apply the best practices in `.agents/skills/` and `.github/skills/` before implementing changes.
- Build new views as React islands inside the ReUI app shell, from ReUI blocks (surface `frame`), dark by default. See "ReUI design system" below.
- Enforce Zod validation on backend endpoints, expose OpenAPI v3.1.0 at `/openapi.json`, `/swagger`, and `/scalar`, and keep endpoints strongly typed.
- Every new service or view must expose `/health` and emit structured logs/metrics into the mirrored D1 logging layer.
# Agent Workspace Overview

Welcome to the `core-template-cfw-assets-astro-shadcn` template. This is a unified full-stack template combining Cloudflare Workers (Backend & Assets) with Astro and React + Shadcn/ui (Frontend).

## Core Architecture

- **Backend:** Cloudflare Workers, Hono (Routing), D1 (Database with Drizzle ORM).
- **Frontend:** Astro (SSR/Static Hybrid), React (Interactive Islands), Tailwind CSS v4, **ReUI** (Pro registry) on shadcn/ui Base UI primitives.
- **Deployment:** Deployed using Cloudflare Workers Assets via `wrangler.jsonc`.

## Mandatory Agent Directives

This repository relies heavily on AI agents for rapid prototyping and feature generation. If you are an AI agent, you must strictly follow these directives:

1. **Read Startup Rules:** Immediately review `.agent/rules/startup.md` before writing any code. It contains critical instructions for your first steps.
2. **Clean State Execution:** The template's default UI has been deliberately wiped clean and replaced with a temporary template-routing warning. Build the user's requested frontend directly from `src/frontend/pages/index.astro` or the route structure you introduce, and keep the shared header available on every page.
3. **Environment Strictness:** We use `worker-configuration.d.ts` for Cloudflare types. Never manually define `interface Bindings`. Always use `Bindings: Env` on Hono applications.
4. **Runtime Baseline:** Use Node.js 22+ when working with Wrangler or regenerating `worker-configuration.d.ts`.
5. **Package Management:** Default to `pnpm` for package installation and script execution.
6. **Authentication Rule:** Use the Secrets Store binding `WORKER_API_KEY` for protected API authentication and session creation. Do not add a `users` table back into this template.
7. **Schema Layout:** Keep Drizzle tables under `db/schemas/${useCase}/${tableName}.ts` and use Drizzle-Zod for API typing where table schemas are involved.
8. **Modularization:** Keep new code modular. Split helpers, components, routes, and persistence code by concern instead of adding large multipurpose files.
9. **Template Replacement Prompt:** If the user gives you the landing-page replacement prompt, replace the starter frontend, preserve the shared header, and keep the dynamic docs pointers to `/openapi.json`, `/swagger`, and `/scalar`.
10. **Frontend Errors:** Never use Chrome/browser alerts. Route every frontend error through the centralized frontend error handling utility and keep the copy-to-clipboard success/error feedback within shadcn components.
11. **Dependency Hygiene:** Follow `.agent/rules/dependency-maintenance.md` whenever dependencies, Wrangler, or generated Cloudflare types may be stale.
12. **Architecture Rules:** Follow `.agent/rules/architecture.md` and `.agent/rules/frontend-error-handling.md` for auth, modularization, and frontend error UX conventions.
13. **CI Ownership:** If GitHub Actions or Cloudflare PR deployment checks fail because of frozen lockfiles, outdated dependencies, or stale Wrangler types, fix them in the same turn by refreshing pnpm dependencies and re-running validation before handing work back.
14. **Import Path Aliases:** ALWAYS use tsconfig path aliases (`@/backend/*`, `@/backend/db/*`, `@/backend/ai/*`, etc.) for all backend imports. Never use relative imports (`../../foo`). Run `node scripts/migrate-imports.mjs` to convert existing relative imports. See `.agent/rules/import-paths.md` for details.
15. **Comprehensive Documentation:** Every backend TypeScript file must have a file-level JSDoc comment explaining its purpose, key features, and usage. Every exported function/class must have JSDoc with `@param`, `@returns`, `@throws`, and `@example` tags where applicable. See `.agent/rules/docstrings.md` for standards.
16. **Agent Meta-Maintenance:** Update `AGENTS.md` and `.agent/rules` files when you add/modify features that future agents should know about. Keep rules concise (<12,000 chars per file), avoid duplication, and resolve conflicts. See `.agent/rules/meta-maintenance.md` for guidelines.
17. **Shared Data Toolkit:** This template ships an isomorphic data/array/object utility toolkit built on [Remeda](https://github.com/remeda/remeda). Reach for it before hand-rolling array/object plumbing. Import from `@/backend/utils/data` on the Worker side and `@/lib/data` on the frontend — both re-export the same isomorphic core at `@/shared/data-utils`. It exposes curated Remeda re-exports (`pipe`, `groupBy`, `unique`, `sortBy`, `pick`, `difference`, …), the full Remeda surface as `R`, and template helpers Remeda doesn't ship (`diffArrays`, `findWhere`, `toggleInArray`, `moveItem`, `keyBy`, `compact`, `ensureArray`, `deal`, `truncate`, `tryParseJson`). Add genuinely-shared helpers to the shared core (never duplicate per-surface). Live demo + docs at `/showcase/utilities`. See `.agent/rules/data-utilities.md`.

## ReUI design system

Adopted 2026-09-25. Authority: the ReUI Astro React design system
(https://claude.ai/artifact/74kf88M44NMA7Xh769vJge) and `~/AGENTS-frontend.md`.

- **Shell:** ReUI `app-shell-12`, adapted in `src/frontend/components/blocks/app-shell-12/`
  and mounted once by `layouts/BaseLayout.astro` (one island; pages are its slot).
  Nav is config-driven from `src/frontend/lib/config.ts` (`navGroups`, max two
  levels; `devLinks` = `/docs`, `/openapi.json`, `/scalar`, `/swagger`, always in
  the rail). Add a page = add a nav entry there; breadcrumb + ⌘K pick it up.
- **Page chrome:** `PageBody` + `PageToolbar` from `blocks/app-shell-12/components/page-toolbar`,
  rendered without a client directive. No emoji headings.
- **Tokens:** `styles/global.css` carries the design-system tokens incl. ReUI's
  extended `info`/`success`/`warning`/`destructive-foreground`/`invert`. Use a
  `*-foreground` state colour only on its tinted ground (`bg-success/10`). No raw
  hex, `rgb()`, or Tailwind palette utilities.
- **Dark default:** `<html class="dark">`; the header toggle stores only an explicit "light".
- **Surface `frame`** on every ReUI search / `compose_page`; never mix frame and card blocks on a screen.
- **Install:** `bash scripts/reui-add.sh <item…>` — never raw `shadcn add`. The
  dual-root `@/*` tsconfig path makes the CLI write to `src/components` and leave
  `from "cn"` imports; the wrapper fixes both, never overwrites, reads
  `REUI_LICENSE_KEY` from the tokens CLI and serializes parallel installs.
  Blocks land in `components/blocks/<name>/`, ReUI primitives in `components/reui/`.
- **Charts:** no pies; bars horizontal unless the x-axis is time; `chart-1..5` in order.
  **Tables:** ReUI Data Grid. **Filters:** ReUI Filters builder.
- **Local UI dev without Cloudflare auth:** `CF_REMOTE_BINDINGS=0 pnpm exec astro dev`
  renders pages without remote bindings. `/api/*` is served by the Hono worker, so
  data and chat only work under `pnpm run build && pnpm exec wrangler dev`.

## Template App Surface (reference implementation)

This template ships a real, running app so new projects inherit working patterns
(extend or delete the pieces you don't need). All of it is wired to D1 via Hono;
no mock data.

- **AI = core-guardian, nothing else.** There are NO Durable Objects and NO Agents
  SDK in this template (removed 2026-09-26; wrangler migration `v4` deletes the old
  classes). Every model call goes through `src/backend/ai/guardian.ts#guardianChat`
  over the `CORE_GUARDIAN` service binding (`service: core-guardian`,
  `entrypoint: GuardianRpc`, `remote: true`). No `ai` binding, no provider SDKs.
  Router 422 = no model in budget, 429 = breaker; map both to plain-language errors.
- **Pages** (Astro SSR + React islands inside the ReUI app shell):
  - `/dashboard`, `/analytics` — metric row → metric-switcher chart → action Data
    Grid (ReUI chart-28, dashboard-4, chart-9, data-grid-base-7 parts). No pies;
    horizontal ranked bars. Components under `components/dashboard/`.
  - `/projects`, `/tasks/board` (ReUI kanban), `/tasks` (ReUI Data Grid with grouping
    + the ReUI **Filters** builder — `components/tasks/task-filtering.tsx`), `/tasks/[id]`.
    Task/kanban/project cards open preview modals. Components under `components/tasks/`.
  - `/notes` — **PlateJS** rich-text editor (`components/notes/`); bodies persist as
    a versioned `{v,format:"plate",value}` JSON envelope in the team-notes `body`
    column, with legacy plain-text fallback.
  - `/inbox` — two-pane inbox backed by Cloudflare **Email Routing**: the Worker
    `email()` handler (`backend/email/inbound.ts`) stores inbound mail in the
    `email_messages` D1 table; UI under `components/inbox/`, API at `/api/inbox`.
  - `/chat` — ReUI Pro block `ai-chat-1` (`components/blocks/ai-chat-1/`), threads in
    `?t=<id>`, backed by `/api/threads` + `POST /api/chat` → core-guardian; history in
    D1 `chat_threads` / `chat_messages`.
  - `/docs` (docs home, bound to `/api/docs/*`) + `/playbook` — documentation using
    the Shiki-backed `ui/code-block.tsx` (kibo-ui-style, base-ui, copy + tabs).
  - `/settings/{preferences,notifications,webhooks,activity,advanced}` (shared
    sub-nav) and `/notifications` (D1 REST, polled every 15s while visible). Components under `components/settings/`.
- **Schemas** live in `db/schemas/{projects,tasks,stats,settings,notifications,chat}/`
  (drizzle-zod + `*_TABLE_DESCRIPTION`/`*_COLUMN_DESCRIPTIONS` for `/docs`).
- **APIs**: `/api/{projects,tasks,team-notes,settings,webhooks,activity,
  notifications,dashboard,threads,chat}` — CRUD + `?q=` search + filters + pagination.
  The dashboard exposes `/stats`, `/charts`, `/insights` (via `guardianChat`).
  Health: `/api/health` (D1 + a no-spend `CORE_GUARDIAN.useCases()` check that fails
  the verdict when the binding is down).
- **Shared frontend helpers**: `lib/api.ts` (`apiGet`/`apiSend`/`ApiError`) and
  `lib/format.ts` (`relativeTime`/`shortDate`/`compactNumber`). Charts use the
  shadcn `ui/chart.tsx` wrapper + the OKLCH `--chart-1..5` palette in `global.css`.
- **Shared data toolkit** (isomorphic, Remeda-backed): one core at
  `shared/data-utils.ts`, re-exported by `lib/data.ts` (frontend, `@/lib/data`)
  and `backend/utils/data.ts` (`@/backend/utils/data`). Curated Remeda re-exports
  + full `R` namespace + template helpers (`diffArrays`, `findWhere`,
  `toggleInArray`, `moveItem`, `keyBy`, `compact`, `ensureArray`, `deal`,
  `truncate`, `tryParseJson`). Live demo: `/showcase/utilities`.
- **Seed demo data**: `POST /api/seed` (idempotent). Locally:
  `pnpm run migrate:local` then `curl -X POST http://localhost:8787/api/seed`.
- **SSR note**: `src/_worker.ts` exports `start(manifest)` + `createExports()`;
  page requests are rendered via `@astrojs/cloudflare/handler#handle`. Do NOT
  revert this to a bare `env.ASSETS.fetch()` fallback — that 404s every SSR page.
- **Auth**: signed session cookie only (no `users`/`sessions` table). Auth gates
  `/api/admin/*`; the feature APIs are intentionally open so the template runs
  out of the box. Tighten before production.
