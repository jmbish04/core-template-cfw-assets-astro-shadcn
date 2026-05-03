/**
 * @fileoverview Main Hono API router
 *
 * This file sets up the main Hono application with all API routes and middleware.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { sessionRouter } from '@/backend/api/routes/auth';
import { dashboardRouter } from '@/backend/api/routes/dashboard';
import { threadsRouter } from '@/backend/api/routes/threads';
import { healthRouter } from '@/backend/api/routes/health';
import { notificationsRouter } from '@/backend/api/routes/notifications';
import { aiRouter } from '@/backend/api/routes/ai';
import { documentsRouter } from '@/backend/api/routes/documents';
import { openapiRouter } from '@/backend/api/routes/openapi';

export type Variables = {
  sessionId?: number;
  sessionKey?: string;
  sessionToken?: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/api/ping', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Mount routers
app.route('/api/auth', sessionRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/threads', threadsRouter);
app.route('/api/health', healthRouter);
app.route('/api/notifications', notificationsRouter);
app.route('/api/ai', aiRouter);
app.route('/api/documents', documentsRouter);
app.route('/', openapiRouter);

export { app };
