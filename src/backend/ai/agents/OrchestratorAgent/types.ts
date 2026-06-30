/**
 * @fileoverview Type definitions for OrchestratorAgent.
 *
 * The orchestrator delegates work to specialist sub-agents (ResearcherAgent,
 * CoderAgent) over real RPC. These types describe the tool input, the result
 * shape returned to the model, and the persisted orchestration state.
 */

import { z } from "zod";

/**
 * Input schema for the `spawnTask` tool the model invokes to delegate work.
 *
 * `agentType` selects the specialist:
 * - `"research"` → {@link ResearcherAgent} (`RESEARCHER_AGENT`)
 * - `"code"`     → {@link CoderAgent} (`CODER_AGENT`)
 */
export const spawnTaskSchema = z.object({
  agentType: z
    .enum(["research", "code"])
    .describe("Which specialist sub-agent should handle the task."),
  task: z
    .string()
    .min(1)
    .describe("The concrete task to delegate to the specialist sub-agent."),
});

export type SpawnTaskParams = z.infer<typeof spawnTaskSchema>;

/**
 * Result of a delegated task, returned to the model (and surfaced in the UI as
 * a tool result). Carries the specialist's *real* output.
 */
export interface SubAgentResult {
  /** Which specialist handled the task. */
  agentType: SpawnTaskParams["agentType"];
  /** The DO instance name the work was routed to. */
  instance: string;
  /** Unique id of this delegation (assigned by the specialist). */
  taskId: string;
  /** Terminal status of the delegated work. */
  status: "completed" | "failed";
  /** The specialist's real output (present on success). */
  output?: string;
  /** Error message (present on failure). */
  error?: string;
  /** Wall-clock duration of the delegated call, in milliseconds. */
  durationMs: number;
}

/**
 * Orchestration counters persisted in the orchestrator's embedded SQLite and
 * mirrored into synced state for live observation by a subscribed client.
 */
export interface OrchestratorState {
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  lastRoutedAgent?: string;
}
