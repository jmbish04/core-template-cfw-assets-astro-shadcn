import type { BriefAnswers } from "./brief-card"
import type { ArtifactRecord, FileRecord } from "./data"

/**
 * The task state the answers act on. One owner holds it, every in message
 * control reads and writes it, so the thread and the panel never disagree.
 */

/** `paused` is the run stopped by the agent's own question, not by the reader;
    `failed` is a step that came back with an error and can be retried. */
export type PlanRun = "idle" | "running" | "paused" | "failed" | "done"

export type AgentState = {
  /** Sources the agent may read on the next turn. */
  contextIds: string[]
  /** The agreed brief, or null while the agent is still asking for it. */
  brief: BriefAnswers | null
  /** Steps left switched on. An unchecked step never runs. */
  stepIds: string[]
  planRun: PlanRun
  /** Steps that have finished, in the order they landed. */
  doneIds: string[]
  /** Steps the reader skipped past a failure. */
  skippedIds: string[]
  /** The step that failed, so the plan can offer a retry on that row only. */
  failedId: string | null
  /** The answer to the mid run question, or null while it is still open. */
  forkValue: string | null
  /** Branch steps that answer switched off, counted when it was given. */
  droppedCount: number
  /** Everything the run has produced so far. */
  artifacts: ArtifactRecord[]
  /** Files staged on the next message. */
  files: FileRecord[]
  ownerId: string
  dueId: string
  taskCreated: boolean
}

export type AgentActions = {
  onSourceToggle: (id: string, on: boolean) => void
  onBriefSubmit: (answers: BriefAnswers) => void
  onBriefReopen: () => void
  onStepToggle: (id: string, on: boolean) => void
  onPlanRun: () => void
  onPlanStop: () => void
  onPlanRetry: () => void
  onPlanSkip: () => void
  onForkAnswer: (value: string) => void
  onFileAdd: (file: FileRecord) => void
  onFileRemove: (id: string) => void
  onOwnerChange: (id: string) => void
  onDueChange: (id: string) => void
  onTaskCreate: () => void
  onTaskCopyLink: () => void
  onArtifactDownload: (name: string) => void
}