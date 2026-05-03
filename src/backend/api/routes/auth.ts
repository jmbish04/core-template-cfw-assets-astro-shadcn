/**
 * @fileoverview Authentication API routes
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { sessions } from '@db/schemas';
import {
  createSessionExpiry,
  createSessionKey,
  createSessionToken,
  extractBearerToken,
  readWorkerApiKey,
  safeEqual,
} from '../lib/auth';

const sessionRouter = new Hono<{ Bindings: Env }>();

const createSessionSchema = z.object({
  apiKey: z.string().min(1),
});

async function createSession(c: Context<{ Bindings: Env }>) {
  const { apiKey } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  try {
    const configuredApiKey = await readWorkerApiKey(c.env);

    if (!(await safeEqual(apiKey, configuredApiKey))) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    const token = createSessionToken();
    const sessionKey = createSessionKey();
    const expiresAt = createSessionExpiry();

    const result = await db
      .insert(sessions)
      .values({
        token,
        sessionKey,
        expiresAt,
        updatedAt: new Date(),
      })
      .returning();

    return c.json(
      {
        session: {
          id: result[0].id,
          token,
          sessionKey,
          expiresAt: expiresAt.toISOString(),
        },
      },
      201,
    );
  } catch (error) {
    console.error('Session creation error:', error);
    return c.json({ error: 'Session creation failed' }, 500);
  }
}

sessionRouter.post('/session', zValidator('json', createSessionSchema), createSession);

sessionRouter.post('/logout', async (c) => {
  const token = extractBearerToken(c.req.header('Authorization'));

  if (!token) {
    return c.json({ error: 'No token provided' }, 400);
  }

  const db = drizzle(c.env.DB);

  try {
    await db.delete(sessions).where(eq(sessions.token, token));
    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

export { sessionRouter };
