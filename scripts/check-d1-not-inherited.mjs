#!/usr/bin/env node
/**
 * Refuse to deploy a copy of this template that is still bound to someone else's
 * D1 database.
 *
 * WHY THIS EXISTS
 *
 * Measured 2026-11-02: wrangler.jsonc's `database_id` held
 * d555f8ce-77c9-4c82-be80-de95b8d9c003, which is core-guardian's PRODUCTION
 * database — alert_rules, invoices, billable_usage, workers_ai_daily_neurons and
 * 128 more tables. Every app scaffolded from this template inherited that binding,
 * so unrelated projects ran Drizzle migrations against the account's spend
 * governor. It had reached 132 tables and 397 MB, and four Workers besides the
 * template were still pointed at it.
 *
 * The placeholder in wrangler.jsonc breaks the inheritance. This check is what
 * stops it coming back: a copy that pastes a real uuid in while still carrying the
 * template's own identity is almost certainly pasting the id it inherited.
 *
 * THE RULE
 *
 * A real-looking `database_id` is allowed only once the project has its own
 * identity — that is, once package.json's `name` is no longer a `core-template-*`
 * name. Renaming the package is the first thing anyone does to a copy, so this
 * gates on the one signal that reliably separates "still the template" from "a real
 * app".
 *
 * ponytail: the package name is the discriminator because nothing cheaper
 * distinguishes a copy from the template. If templates ever carry a marker file,
 * gate on that instead.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** wrangler.jsonc is JSON with comments and trailing commas; strip both. */
export function parseJsonc(text) {
  const noComments = text
    .replace(/"(?:[^"\\]|\\.)*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => (m.startsWith('"') ? m : " "));
  return JSON.parse(noComments.replace(/,(\s*[}\]])/g, "$1"));
}

/** The whole rule, in one place, so the self-check can drive it. */
export function verdict({ packageName, databases }) {
  const isTemplate = /^core-template/.test(packageName || "");
  const inherited = (databases || []).filter((d) => UUID.test(String(d.database_id || "")));
  if (!isTemplate || inherited.length === 0) return { ok: true, inherited: [] };
  return { ok: false, inherited };
}

function main() {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const wrangler = parseJsonc(readFileSync(join(ROOT, "wrangler.jsonc"), "utf8"));
  const result = verdict({ packageName: pkg.name, databases: wrangler.d1_databases });
  if (result.ok) {
    console.log("check-d1-not-inherited: ok");
    return 0;
  }
  console.error(
    `check-d1-not-inherited: this project still calls itself "${pkg.name}", but wrangler.jsonc ` +
      `binds a real D1 database:\n` +
      result.inherited.map((d) => `  ${d.binding} -> ${d.database_name} (${d.database_id})`).join("\n") +
      `\n\nA copy of the template must create its own database:\n` +
      `  npx wrangler d1 create <your-app-name>\n` +
      `then put the new name and uuid in wrangler.jsonc and rename this package.\n` +
      `If you ARE the template, the id belongs in wrangler.jsonc as a placeholder, not a uuid.`,
  );
  return 1;
}

function selfCheck() {
  const real = "d555f8ce-77c9-4c82-be80-de95b8d9c003";
  const cases = [
    // [what, input, expected ok]
    ["the template carrying a real uuid is refused — the bug this exists for",
     { packageName: "core-template-cfw-assets-astro-shadcn", databases: [{ database_id: real }] }, false],
    ["the template with the placeholder passes",
     { packageName: "core-template-cfw-assets-astro-shadcn", databases: [{ database_id: "replace-me-run-wrangler-d1-create" }] }, true],
    ["a renamed copy with its own real uuid passes",
     { packageName: "my-new-app", databases: [{ database_id: real }] }, true],
    ["the reui template is caught too, not just this one",
     { packageName: "core-template-cf-reui", databases: [{ database_id: "c1452c1a-8dde-4e87-9258-f6a40f315e11" }] }, false],
    ["an uppercase uuid is still a uuid",
     { packageName: "core-template-x", databases: [{ database_id: real.toUpperCase() }] }, false],
    ["no d1 block at all passes",
     { packageName: "core-template-x", databases: undefined }, true],
    ["one real id among placeholders is still refused",
     { packageName: "core-template-x", databases: [{ database_id: "replace-me" }, { database_id: real }] }, false],
  ];
  for (const [what, input, expected] of cases) {
    const got = verdict(input).ok;
    if (got !== expected) throw new Error(`self-check failed: ${what} (expected ok=${expected}, got ${got})`);
  }
  // The parser has to survive the comments and trailing commas this repo's config uses.
  const parsed = parseJsonc('{\n // a line comment with "a quote\n "a": 1, /* block */\n "b": [2,],\n}');
  if (parsed.a !== 1 || parsed.b.length !== 1) throw new Error("self-check failed: jsonc parsing");
  if (parseJsonc('{"url": "https://x/y//z"}').url !== "https://x/y//z") {
    throw new Error("self-check failed: a // inside a string is not a comment");
  }
  console.log("check-d1-not-inherited: self-check passed");
  return 0;
}

process.exit(process.argv.includes("--self-check") ? selfCheck() : main());
