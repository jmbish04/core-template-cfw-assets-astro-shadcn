/**
 * @fileoverview Documents API routes for PlateJS integration
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, and } from 'drizzle-orm';
import { documents, insertDocumentSchema } from '@db/schemas';
import { authMiddleware } from '@/backend/api/middleware/auth';
import type { Variables } from '@/backend/api/index';

const documentsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware
documentsRouter.use('*', authMiddleware);

const createDocumentSchema = insertDocumentSchema.pick({
  title: true,
  content: true,
});

// GET /api/documents
documentsRouter.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;

  try {
    const sessionDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.sessionKey, sessionKey))
      .orderBy(desc(documents.updatedAt));

    return c.json({ documents: sessionDocuments });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return c.json({ error: 'Failed to fetch documents' }, 500);
  }
});

// POST /api/documents
documentsRouter.post('/', zValidator('json', createDocumentSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;
  const { title, content } = c.req.valid('json');

  try {
    const result = await db
      .insert(documents)
      .values({
        sessionKey,
        title,
        content,
      })
      .returning();

    return c.json({ document: result[0] }, 201);
  } catch (error) {
    console.error('Error creating document:', error);
    return c.json({ error: 'Failed to create document' }, 500);
  }
});

// GET /api/documents/:id
documentsRouter.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;
  const documentId = Number.parseInt(c.req.param('id'), 10);

  try {
    const documentResult = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.sessionKey, sessionKey)))
      .limit(1);

    if (documentResult.length === 0) {
      return c.json({ error: 'Document not found' }, 404);
    }

    return c.json({ document: documentResult[0] });
  } catch (error) {
    console.error('Error fetching document:', error);
    return c.json({ error: 'Failed to fetch document' }, 500);
  }
});

// PUT /api/documents/:id
documentsRouter.put('/:id', zValidator('json', createDocumentSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;
  const documentId = Number.parseInt(c.req.param('id'), 10);
  const { title, content } = c.req.valid('json');

  try {
    const result = await db
      .update(documents)
      .set({
        title,
        content,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), eq(documents.sessionKey, sessionKey)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Document not found' }, 404);
    }

    return c.json({ document: result[0] });
  } catch (error) {
    console.error('Error updating document:', error);
    return c.json({ error: 'Failed to update document' }, 500);
  }
});

// DELETE /api/documents/:id
documentsRouter.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get('sessionKey')!;
  const documentId = Number.parseInt(c.req.param('id'), 10);

  try {
    const result = await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.sessionKey, sessionKey)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Document not found' }, 404);
    }

    return c.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return c.json({ error: 'Failed to delete document' }, 500);
  }
});

export { documentsRouter };
