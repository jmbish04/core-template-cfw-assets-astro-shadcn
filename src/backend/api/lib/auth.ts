const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashValue(value: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(digest);
}

export function createSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

export function createSessionKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bytesToHex(bytes);
}

export function createSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export async function readWorkerApiKey(env: Env): Promise<string> {
  const apiKey = await env.WORKER_API_KEY.get();

  if (!apiKey) {
    throw new Error(
      "WORKER_API_KEY secret is not configured. Set it before using session auth, for example with `wrangler secret put WORKER_API_KEY`.",
    );
  }

  return apiKey;
}

export function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7);
}

export async function safeEqual(left: string, right: string): Promise<boolean> {
  const [leftBytes, rightBytes] = await Promise.all([hashValue(left), hashValue(right)]);
  let mismatch = 0;

  for (let index = 0; index < leftBytes.length; index += 1) {
    mismatch |= leftBytes[index] ^ rightBytes[index];
  }

  return mismatch === 0;
}
