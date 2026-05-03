const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
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
    throw new Error("WORKER_API_KEY secret is not configured.");
  }

  return apiKey;
}

export function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7);
}

export function safeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length === rightBytes.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}
