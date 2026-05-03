/**
 * @fileoverview Threads API routes for AI assistant conversations
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, and } from 'drizzle-orm';
import { insertMessageSchema, insertThreadSchema, messages, threads } from '@db/schemas';
import { authMiddleware } from '@/backend/api/middleware/auth';
import type { Variables } from '@/backend/api/index';

const threadsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware
threadsRouter.use('*', authMiddleware);

const createThreadSchema = insertThreadSchema.pick({
  title: true,
});

const createMessageSchema = insertMessageSchema.pick({
  role: true,
  content: true,
  metadata: true,
});

// GET /api/threads
threadsRouter.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;

  try {
    const sessionThreads = await db
      .select()
      .from(threads)
      .where(eq(threads.sessionKey, sessionKey))
      .orderBy(desc(threads.updatedAt));

    return c.json({ threads: sessionThreads });
  } catch (error) {
    console.error('Error fetching threads:', error);
    return c.json({ error: 'Failed to fetch threads' }, 500);
  }
});

// POST /api/threads
threadsRouter.post('/', zValidator('json', createThreadSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;
  const { title } = c.req.valid('json');

  try {
    const result = await db
      .insert(threads)
      .values({
        sessionKey,
        title,
      })
      .returning();

    return c.json({ thread: result[0] }, 201);
  } catch (error) {
    console.error('Error creating thread:', error);
    return c.json({ error: 'Failed to create thread' }, 500);
  }
});

// GET /api/threads/:id
threadsRouter.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;
  const threadId = Number.parseInt(c.req.param('id'), 10);

  try {
    const threadResult = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, threadId), eq(threads.sessionKey, sessionKey)))
      .limit(1);

    if (threadResult.length === 0) {
      return c.json({ error: 'Thread not found' }, 404);
    }

    return c.json({ thread: threadResult[0] });
  } catch (error) {
    console.error('Error fetching thread:', error);
    return c.json({ error: 'Failed to fetch thread' }, 500);
  }
});

// GET /api/threads/:id/messages
threadsRouter.get('/:id/messages', async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;
  const threadId = Number.parseInt(c.req.param('id'), 10);

  try {
    const threadResult = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, threadId), eq(threads.sessionKey, sessionKey)))
      .limit(1);

    if (threadResult.length === 0) {
      return c.json({ error: 'Thread not found' }, 404);
    }

    const threadMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(messages.createdAt);

    return c.json({ messages: threadMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// POST /api/threads/:id/messages
threadsRouter.post('/:id/messages', zValidator('json', createMessageSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;
  const threadId = Number.parseInt(c.req.param('id'), 10);
  const { role, content, metadata } = c.req.valid('json');

  try {
    const threadResult = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, threadId), eq(threads.sessionKey, sessionKey)))
      .limit(1);

    if (threadResult.length === 0) {
      return c.json({ error: 'Thread not found' }, 404);
    }

    const result = await db
      .insert(messages)
      .values({
        threadId,
        role,
        content,
        metadata,
      })
      .returning();

    await db
      .update(threads)
      .set({ updatedAt: new Date() })
      .where(eq(threads.id, threadId));

    return c.json({ message: result[0] }, 201);
  } catch (error) {
    console.error('Error creating message:', error);
    return c.json({ error: 'Failed to create message' }, 500);
  }
});

// DELETE /api/threads/:id
threadsRouter.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;
  const threadId = Number.parseInt(c.req.param('id'), 10);

  try {
    const result = await db
      .delete(threads)
      .where(and(eq(threads.id, threadId), eq(threads.sessionKey, sessionKey)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Thread not found' }, 404);
    }

    return c.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error deleting thread:', error);
    return c.json({ error: 'Failed to delete thread' }, 500);
  }
});

export { threadsRouter };
