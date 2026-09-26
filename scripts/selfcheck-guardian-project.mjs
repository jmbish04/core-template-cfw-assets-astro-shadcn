/**
 * Runnable self-check for the wrangler.jsonc transform in
 * `scripts/set-guardian-project.mjs`.
 *
 *   node scripts/selfcheck-guardian-project.mjs
 *
 * This one is a DEPLOY GUARD, which is the category that most often reads as
 * diligence while being incapable of firing: it runs on every deploy, prints a
 * reassuring line, and nobody looks again. So the cases below are the ones that
 * would make it wrong rather than the ones that make it look right — a `//`
 * inside a string, a `name` that only appears in a comment, a missing `vars`
 * block, and comment preservation.
 *
 * Break to verify each section still fails:
 *   - comments/URLs: make stripJsonc sweep `//` without tracking strings
 *   - insert/update: make applyGuardianProject return `{changed:false}` always
 *   - missing name / missing vars: make it return instead of throwing
 */
import assert from "node:assert/strict";

import { applyGuardianProject } from "./set-guardian-project.mjs";

/** A config shaped like the real one: comments, a URL, a trailing comma. */
const CONFIG = `{
  "name": "my-worker",
  // A comment mentioning https://developers.cloudflare.com/workers/ and a
  // stray "name": "NOT_THE_WORKER" that must not be mistaken for the real key.
  "main": "dist/_worker.js/index.js",
  /* A block comment.
     "name": "ALSO_NOT_THE_WORKER" */
  "vars": {
    // Keep this note.
    "INBOX_FORWARD_TO": "",
    "DOCS": "https://example.com//double-slash",
  },
}`;

// --- 1. inserts the var, and leaves everything else alone --------------------
{
  const first = applyGuardianProject(CONFIG);
  assert.equal(first.name, "my-worker", "the Worker name comes from the real top-level key");
  assert.equal(first.previous, null, "there was no previous value to report");
  assert.equal(first.changed, true, "an absent var is a change");
  assert.match(first.text, /"GUARDIAN_PROJECT":\s*"my-worker"/, "the var is written");

  assert.ok(first.text.includes("// Keep this note."), "existing comments must survive");
  assert.ok(
    first.text.includes("https://developers.cloudflare.com/workers/"),
    "a URL inside a comment must survive — a naive // sweep truncates the file here",
  );
  assert.ok(
    first.text.includes('"https://example.com//double-slash"'),
    "a // inside a STRING VALUE is not a comment and must survive",
  );
  // The decoys live in comments, and comments are preserved — so they are
  // still in the text. What must be true is that neither was used as the NAME,
  // which the `first.name` assertion above covers.
  assert.ok(
    first.text.includes('"name": "NOT_THE_WORKER"'),
    "the decoy comment is preserved verbatim, like every other comment",
  );
  assert.ok(
    !/"GUARDIAN_PROJECT":\s*"(NOT|ALSO_NOT)_THE_WORKER"/.test(first.text),
    "a decoy inside a comment must never become the project name",
  );
  assert.ok(
    first.text.includes('"INBOX_FORWARD_TO": ""'),
    "other vars are untouched",
  );

  // --- 2. idempotent ---------------------------------------------------------
  const second = applyGuardianProject(first.text);
  assert.equal(second.changed, false, "running twice must be a no-op");
  assert.equal(second.text, first.text, "a no-op must not rewrite a single byte");

  // --- 3. updates a stale value ---------------------------------------------
  const drifted = first.text.replace('"GUARDIAN_PROJECT": "my-worker"', '"GUARDIAN_PROJECT": "old-name"');
  const fixed = applyGuardianProject(drifted);
  assert.equal(fixed.changed, true, "a stale value is a change");
  assert.equal(fixed.previous, "old-name", "the previous value is reported, so the log is useful");
  assert.match(fixed.text, /"GUARDIAN_PROJECT":\s*"my-worker"/, "the stale value is corrected");
}

// --- 4. refuses rather than guessing ----------------------------------------
{
  assert.throws(
    () => applyGuardianProject('{\n  "vars": { "A": "b" }\n}'),
    /no top-level `name`/,
    "a config with no name must throw, not silently write an empty project",
  );

  assert.throws(
    () => applyGuardianProject('{\n  "name": "w"\n}'),
    /no `vars` object/,
    "a config with nowhere to put the var must throw, not report success",
  );
}

// --- 5. the name is read from the real key, not the first textual match ------
{
  const decoyFirst = `{
  // "name": "COMMENT_DECOY"
  "compatibility_date": "2026-05-25",
  "name": "real-worker",
  "vars": { "A": "b" }
}`;
  assert.equal(
    applyGuardianProject(decoyFirst).name,
    "real-worker",
    "the name must come from a parse, not a regex over raw text",
  );
}

console.log("selfcheck-guardian-project: all wrangler-config assertions passed");
