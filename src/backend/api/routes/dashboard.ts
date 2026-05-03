/**
 * @fileoverview Dashboard API routes
 */

import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, and, gte } from 'drizzle-orm';
import { dashboardMetrics } from '@db/schemas';
import { authMiddleware } from '../middleware/auth';
import type { Variables } from '../index';

const dashboardRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
dashboardRouter.use('*', authMiddleware);

// GET /api/dashboard/metrics
dashboardRouter.get('/metrics', async (c) => {
  const db = drizzle(c.env.DB);
  const category = c.req.query('category');
  const limit = Number.parseInt(c.req.query('limit') || '100', 10);

  try {
    let query = db.select().from(dashboardMetrics);

    if (category) {
      query = query.where(eq(dashboardMetrics.category, category));
    }

    const metrics = await query.orderBy(desc(dashboardMetrics.timestamp)).limit(limit);

    const grouped = metrics.reduce<Record<string, typeof metrics>>((accumulator, metric) => {
      if (!accumulator[metric.category]) {
        accumulator[metric.category] = [];
      }
      accumulator[metric.category].push(metric);
      return accumulator;
    }, {});

    return c.json({
      metrics,
      grouped,
      total: metrics.length,
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return c.json({ error: 'Failed to fetch metrics' }, 500);
  }
});

// GET /api/dashboard/summary
dashboardRouter.get('/summary', async (c) => {
  const db = drizzle(c.env.DB);

  try {
    const allMetrics = await db
      .select()
      .from(dashboardMetrics)
      .orderBy(desc(dashboardMetrics.timestamp))
      .limit(1000);

    const latestMetrics = allMetrics.reduce<Record<string, (typeof allMetrics)[number]>>(
      (accumulator, metric) => {
        const nextMetricTime = metric.timestamp?.getTime?.() ?? 0;
        const currentMetricTime =
          accumulator[metric.metricName]?.timestamp?.getTime?.() ?? 0;

        if (
          !accumulator[metric.metricName] ||
          nextMetricTime > currentMetricTime
        ) {
          accumulator[metric.metricName] = metric;
        }
        return accumulator;
      },
      {},
    );

    return c.json({
      summary: Object.values(latestMetrics),
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return c.json({ error: 'Failed to fetch summary' }, 500);
  }
});

// GET /api/dashboard/charts/:category
dashboardRouter.get('/charts/:category', async (c) => {
  const db = drizzle(c.env.DB);
  const category = c.req.param('category');
  const days = Number.parseInt(c.req.query('days') || '7', 10);

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await db
      .select()
      .from(dashboardMetrics)
      .where(
        and(
          eq(dashboardMetrics.category, category),
          gte(dashboardMetrics.timestamp, startDate),
        ),
      )
      .orderBy(desc(dashboardMetrics.timestamp));

    const chartData = metrics.map((metric) => ({
      timestamp: metric.timestamp,
      value: metric.metricValue,
      name: metric.metricName,
      type: metric.metricType,
    }));

    return c.json({ data: chartData });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return c.json({ error: 'Failed to fetch chart data' }, 500);
  }
});

export { dashboardRouter };
