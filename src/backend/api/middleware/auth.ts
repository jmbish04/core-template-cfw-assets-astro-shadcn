/**
 * @fileoverview Authentication middleware
 */

import type { Context, Next } from "hono";

import { sessions } from "@db/schemas";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { Variables } from "@/backend/api/index";

import { extractBearerToken } from "@/backend/api/lib/auth";

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const token = extractBearerToken(c.req.header("Authorization"));

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = drizzle(c.env.DB);

  try {
    const sessionResult = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    if (sessionResult.length === 0) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const session = sessionResult[0];

    if (session.expiresAt.getTime() < Date.now()) {
      return c.json({ error: "Session expired" }, 401);
    }

    c.set("sessionId", session.id);
    c.set("sessionKey", session.sessionKey);
    c.set("sessionToken", session.token);

    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return c.json({ error: "Authentication failed" }, 500);
  }
}
