# AGENTS

- At the start of every turn, use the `cloudflare-docs` MCP server to verify Cloudflare assumptions, architecture, and deprecations before writing or changing code.
- Review and apply the best practices in `.agents/skills/` and `.github/skills/` before implementing changes.
- Build new views as React islands on top of the existing Astro + Shadcn foundation, using the dark/moody theme system and subtle contrast instead of heavy borders.
- Enforce Zod validation on backend endpoints, expose OpenAPI v3.1.0 at `/openapi.json`, `/swagger`, and `/scalar`, and keep endpoints strongly typed.
- Every new service or view must expose `/health` and emit structured logs/metrics into the mirrored D1 logging layer.
