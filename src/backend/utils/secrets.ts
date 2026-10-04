/**
 * @fileoverview Secret + signing-key helpers for the template.
 *
 * Reads values from the Secrets Store bindings declared in `wrangler.jsonc`
 * (which expose an async `.get()`), falling back to plain env vars for local
 * development. Domain-specific helpers (Google service accounts, R2 access
 * keys, third-party integrations) were removed when this repo was slimmed to
 * a template — add your own as you wire new integrations.
 */

/**
 * Generic helper to read a secret value by binding name.
 *
 * Precedence:
 * 1. Secrets Store / Secret binding (async `.get()`)
 * 2. Plain env var (string) — local/dev fallback
 */
export async function getSecret(env: Env, key: string): Promise<string | undefined> {
  const envVal = (env as Record<string, any>)[key];
  if (envVal && typeof envVal?.get === "function") {
    return await envVal.get();
  }
  return envVal;
}

/**
 * Fetch the WORKER_API_KEY (used for the single-user login + GitHub webhook
 * signature verification).
 */
export async function getWorkerApiKey(env: Env): Promise<string | undefined> {
  if (env.WORKER_API_KEY) {
    return typeof env.WORKER_API_KEY === "string"
      ? env.WORKER_API_KEY
      : await (env.WORKER_API_KEY as any).get();
  }
  return getSecret(env, "WORKER_API_KEY");
}

/** Fetch the Cloudflare API token (Wrangler / provisioning operations). */
export async function getCloudflareApiToken(env: Env): Promise<string | undefined> {
  if (env.CLOUDFLARE_WRANGLER_API_TOKEN) {
    return typeof env.CLOUDFLARE_WRANGLER_API_TOKEN === "string"
      ? env.CLOUDFLARE_WRANGLER_API_TOKEN
      : await (env.CLOUDFLARE_WRANGLER_API_TOKEN as any).get();
  }
  return getSecret(env, "CLOUDFLARE_WRANGLER_API_TOKEN");
}

/** Fetch the Cloudflare account id. */
export async function getCloudflareAccountId(env: Env): Promise<string | undefined> {
  if (env.CLOUDFLARE_ACCOUNT_ID) {
    return typeof env.CLOUDFLARE_ACCOUNT_ID === "string"
      ? env.CLOUDFLARE_ACCOUNT_ID
      : await (env.CLOUDFLARE_ACCOUNT_ID as any).get();
  }
  return getSecret(env, "CLOUDFLARE_ACCOUNT_ID");
}

/**
 * HMAC key used to sign the session cookie.
 *
 * Derived from WORKER_API_KEY (Secret Store — always bound, stable, the same
 * root the passcode is checked against). It is NOT stored in KV.
 *
 * The previous implementation read a random key from the `SESSIONS` KV and, on
 * any transient miss (`get` returning null — KV is eventually consistent) or
 * error, generated a NEW random key and overwrote it. That silently invalidated
 * every live cookie, so a session that worked yesterday suddenly demanded a
 * fresh login on every page — then re-login worked (new key) until the next
 * blip. A key tied to WORKER_API_KEY can never diverge between sign and verify
 * and survives KV hiccups; rotating WORKER_API_KEY is the deliberate (and only)
 * way to invalidate all sessions at once.
 */
export async function getCookieSigningKey(env: Env): Promise<string> {
  const root = await getWorkerApiKey(env);
  if (!root) throw new Error("WORKER_API_KEY is not bound; cannot sign session cookies");
  // Namespaced so the raw API key is never itself the HMAC key.
  return `cr_session_v1:${root}`;
}

/**
 * GitHub webhook secret. Maps to WORKER_API_KEY in this template.
 */
export async function getGitHubWebhookSecret(env: Env): Promise<string> {
  const secret = await getWorkerApiKey(env);
  if (!secret) {
    throw new Error("Missing WORKER_API_KEY in Secrets Store");
  }
  return secret;
}
