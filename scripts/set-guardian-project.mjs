#!/usr/bin/env node
/**
 * Keep `vars.GUARDIAN_PROJECT` in wrangler.jsonc equal to the Worker's `name`.
 *
 *   node scripts/set-guardian-project.mjs [--check]
 *
 * WHY: core-guardian bills and logs every run against the `project` in its
 * payload. That used to be a string literal in the client, so a Worker forked
 * from this template reported its spend and its routing decisions under the
 * template's name — and nothing looked broken while it happened. The name now
 * comes from a var, and this script is what stops the var drifting from the
 * Worker it describes. It runs as part of `pnpm run deploy`.
 *
 * `--check` reports drift without writing, and exits 1 if there is any: use it
 * in CI to fail a build whose attribution would be wrong.
 *
 * The file is edited as TEXT, not parsed and re-serialised. wrangler.jsonc
 * carries a lot of hard-won commentary (the DO migration history, the Email
 * Routing setup) and a JSON round-trip would delete all of it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(ROOT, "wrangler.jsonc");
const VAR = "GUARDIAN_PROJECT";

/**
 * Strip JSONC comments so the result can go through `JSON.parse`.
 *
 * String-aware on purpose: wrangler.jsonc contains `https://` URLs inside its
 * comments and could contain them inside values, and a naive `//` sweep would
 * truncate the file at the first one.
 *
 * @param {string} text Raw JSONC.
 * @returns {string} The same text with comments and trailing commas removed.
 */
function stripJsonc(text) {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLine) {
      if (ch === "\n") {
        inLine = false;
        out += ch;
      }
      continue;
    }
    if (inBlock) {
      if (ch === "*" && next === "/") {
        inBlock = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += text[i + 1] ?? "";
        i += 1;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLine = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlock = true;
      i += 1;
      continue;
    }
    out += ch;
  }

  // Trailing commas are legal in JSONC and not in JSON.
  return out.replace(/,(\s*[}\]])/g, "$1");
}

/**
 * Locate the body of a top-level object key, by brace matching.
 *
 * @param {string} text Raw JSONC.
 * @param {string} key The key whose object body to find, e.g. "vars".
 * @returns {{open: number, close: number} | null} Indices of the `{` and its `}`.
 */
function findObjectBody(text, key) {
  const opener = new RegExp(`"${key}"\\s*:\\s*\\{`).exec(text);
  if (!opener) return null;
  const open = opener.index + opener[0].length - 1;

  let depth = 0;
  let inString = false;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { open, close: i };
    }
  }
  return null;
}

/**
 * Set `vars.GUARDIAN_PROJECT` to the Worker's `name`.
 *
 * @param {string} text Raw wrangler.jsonc.
 * @returns {{text: string, name: string, previous: string | null, changed: boolean}}
 * @throws {Error} when the config has no `name`, or no `vars` object to write into.
 */
export function applyGuardianProject(text) {
  const parsed = JSON.parse(stripJsonc(text));
  const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
  if (!name) {
    throw new Error("wrangler.jsonc has no top-level `name`; nothing to derive the project from.");
  }

  const vars = findObjectBody(text, "vars");
  if (!vars) {
    throw new Error("wrangler.jsonc has no `vars` object to write GUARDIAN_PROJECT into.");
  }

  const body = text.slice(vars.open, vars.close + 1);
  const existing = new RegExp(`("${VAR}"\\s*:\\s*)"((?:[^"\\\\]|\\\\.)*)"`).exec(body);

  if (existing) {
    const previous = existing[2];
    if (previous === name) return { text, name, previous, changed: false };
    const nextBody = body.replace(existing[0], `${existing[1]}${JSON.stringify(name)}`);
    return {
      text: text.slice(0, vars.open) + nextBody + text.slice(vars.close + 1),
      name,
      previous,
      changed: true,
    };
  }

  // Insert as the first entry, carrying the note that explains itself.
  const indent = /\n(\s+)\S/.exec(body)?.[1] ?? "    ";
  const inserted =
    `{\n${indent}// Set by scripts/set-guardian-project.mjs on every deploy: core-guardian\n` +
    `${indent}// attributes this Worker's spend and routing decisions to this name.\n` +
    `${indent}"${VAR}": ${JSON.stringify(name)},` +
    body.slice(1);
  return {
    text: text.slice(0, vars.open) + inserted + text.slice(vars.close + 1),
    name,
    previous: null,
    changed: true,
  };
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const original = readFileSync(CONFIG, "utf8");

  let result;
  try {
    result = applyGuardianProject(original);
  } catch (error) {
    console.error(`set-guardian-project: ${error.message}`);
    process.exit(1);
  }

  if (!result.changed) {
    console.log(`set-guardian-project: ${VAR} already "${result.name}"`);
    return;
  }

  const from = result.previous === null ? "(absent)" : `"${result.previous}"`;
  if (checkOnly) {
    console.error(`set-guardian-project: ${VAR} is ${from}, should be "${result.name}"`);
    process.exit(1);
  }

  writeFileSync(CONFIG, result.text);
  console.log(`set-guardian-project: ${VAR} ${from} -> "${result.name}"`);
}

// Only run when invoked directly, so the self-check can import the transform.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
