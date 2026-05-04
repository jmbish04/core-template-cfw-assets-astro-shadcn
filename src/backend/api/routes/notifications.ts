/**
 * @fileoverview Notifications API routes
 */

import { notifications } from "@db/schemas";
import { desc, eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

import type { Variables } from "@/backend/api/index";

import { authMiddleware } from "@/backend/api/middleware/auth";

const notificationsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware
notificationsRouter.use("*", authMiddleware);

// GET /api/notifications
notificationsRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get("sessionKey")!;
  const unreadOnly = c.req.query("unreadOnly") === "true";

  try {
    const filters = [eq(notifications.sessionKey, sessionKey)];

    if (unreadOnly) {
      filters.push(eq(notifications.isRead, false));
    }

    const sessionNotifications = await db
      .select()
      .from(notifications)
      .where(and(...filters))
      .orderBy(desc(notifications.createdAt))
      .limit(100);

    const unreadCount = sessionNotifications.filter((notification) => !notification.isRead).length;

    return c.json({
      notifications: sessionNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return c.json({ error: "Failed to fetch notifications" }, 500);
  }
});

// PUT /api/notifications/:id/read
notificationsRouter.put("/:id/read", async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get("sessionKey")!;
  const notificationId = Number.parseInt(c.req.param("id"), 10);

  try {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.sessionKey, sessionKey)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: "Notification not found" }, 404);
    }

    return c.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error updating notification:", error);
    return c.json({ error: "Failed to update notification" }, 500);
  }
});

// PUT /api/notifications/read-all
notificationsRouter.put("/read-all", async (c) => {
  const db = drizzle(c.env.DB);
  const sessionKey = c.get("sessionKey")!;

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.sessionKey, sessionKey), eq(notifications.isRead, false)));

    return c.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return c.json({ error: "Failed to update notifications" }, 500);
  }
});

export { notificationsRouter };
