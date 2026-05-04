import { desc, eq } from "drizzle-orm";

import type { OrchestratorAgent } from "@/backend/ai/agents/orchestrator/index";

import { getDb } from "@/db";
import { roles } from "@/db/schema";

export async function handleListRoles(agent: OrchestratorAgent, env: Env, status?: string) {
  const db = getDb(env);

  if (status) {
    return db
      .select()
      .from(roles)
      .where(eq(roles.status, status as typeof roles.$inferSelect.status));
  }

  return db.select().from(roles).orderBy(desc(roles.createdAt));
}

export async function handleUpdateRole(
  agent: OrchestratorAgent,
  env: Env,
  id: string,
  patch: Partial<typeof roles.$inferInsert>,
) {
  const db = getDb(env);
  const [updated] = await db
    .update(roles)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(roles.id, id))
    .returning();

  return updated;
}
