/**
 * @fileoverview TaskSubtasks — the "Tasks" checklist card for the task viewport,
 * backed by `GET/POST/PATCH/DELETE /api/tasks/{id}/subtasks`. This card OWNS the
 * task's completion presentation (the standalone "Completion" stepper card was
 * folded in here to match the mockup):
 *
 *   Header  → a "Tasks" title with a "{done}/{total} completed" label on the
 *             right (derived from the real subtask rows).
 *   Bar     → a thin progress bar directly beneath the header. When subtasks
 *             exist the bar reflects them; when there are ZERO subtasks it
 *             reflects the task's own `progress` and a compact −/+10 stepper +
 *             presets is shown as a fallback so subtask-less tasks can still set
 *             progress manually.
 *   List    → the Base-UI Checkbox rows (strikethrough + muted when done) with a
 *             hover delete button, then an add-subtask input.
 *
 * Because the server re-derives the parent task's `progress` from these rows on
 * every mutation, we surface `onProgressChange(progress)` so the parent viewport
 * (and thus the board / table / sidebar) stays in sync without a full refetch.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { apiGet, apiSend, ApiError } from "@/lib/api";

import { ErrorState } from "./Shared";
import type { TaskSubtask } from "./types";

/** Quick-set progress presets for the subtask-less manual fallback. */
const PROGRESS_PRESETS = [0, 25, 50, 75, 100];

/** Clamp an arbitrary number into the inclusive 0–100 progress range. */
function clampProgress(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export interface TaskSubtasksProps {
  taskId: string;
  /**
   * The task's own `progress` (0–100). Used ONLY as the fallback bar + manual
   * control target when the task has zero subtasks; when subtasks exist the bar
   * is derived from them instead.
   */
  taskProgress: number;
  /** True while a parent PATCH is in flight (disables the manual controls). */
  saving?: boolean;
  /**
   * Called with the newly-derived 0–100 completion percentage whenever the
   * subtask set changes, so the parent can keep `task.progress` in sync with
   * what the server just computed.
   */
  onProgressChange?: (progress: number) => void;
  /**
   * PATCH the task's `progress` directly. Invoked only by the manual fallback
   * control shown when there are zero subtasks.
   */
  onSetProgress?: (progress: number) => void;
}

/** Derive the 0–100 completion percentage from a set of subtasks. */
function deriveProgress(subtasks: TaskSubtask[]): number {
  if (subtasks.length === 0) return 0;
  const done = subtasks.filter((s) => s.done).length;
  return Math.round((done / subtasks.length) * 100);
}

/** Subtasks checklist card for a single task. */
export function TaskSubtasks({
  taskId,
  taskProgress,
  saving = false,
  onProgressChange,
  onSetProgress,
}: TaskSubtasksProps) {
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ data: TaskSubtask[] }>(`tasks/${taskId}/subtasks`);
      setSubtasks(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load subtasks.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Apply a new subtask list to state and notify the parent of the new progress. */
  const commit = useCallback(
    (next: TaskSubtask[]) => {
      setSubtasks(next);
      onProgressChange?.(deriveProgress(next));
    },
    [onProgressChange],
  );

  const add = useCallback(async () => {
    const title = draft.trim();
    if (!title || adding) return;
    setAdding(true);
    setError(null);
    setDraft("");
    try {
      const created = await apiSend<TaskSubtask>("POST", `tasks/${taskId}/subtasks`, { title });
      commit([...subtasks, created]);
    } catch (e) {
      setDraft(title);
      setError(e instanceof ApiError ? e.message : "Failed to add subtask.");
    } finally {
      setAdding(false);
    }
  }, [adding, commit, draft, subtasks, taskId]);

  const toggle = useCallback(
    async (subtask: TaskSubtask, done: boolean) => {
      const prev = subtasks;
      const next = subtasks.map((s) => (s.id === subtask.id ? { ...s, done } : s));
      commit(next);
      try {
        await apiSend<TaskSubtask>("PATCH", `tasks/${taskId}/subtasks/${subtask.id}`, { done });
      } catch (e) {
        commit(prev);
        setError(e instanceof ApiError ? e.message : "Failed to update subtask.");
      }
    },
    [commit, subtasks, taskId],
  );

  const remove = useCallback(
    async (subtask: TaskSubtask) => {
      const prev = subtasks;
      commit(subtasks.filter((s) => s.id !== subtask.id));
      try {
        await apiSend<{ ok: boolean }>("DELETE", `tasks/${taskId}/subtasks/${subtask.id}`);
      } catch (e) {
        commit(prev);
        setError(e instanceof ApiError ? e.message : "Failed to delete subtask.");
      }
    },
    [commit, subtasks, taskId],
  );

  const hasSubtasks = subtasks.length > 0;
  const doneCount = subtasks.filter((s) => s.done).length;
  // When subtasks exist the bar is derived from them; otherwise it reflects the
  // task's own manually-set progress.
  const barValue = hasSubtasks ? deriveProgress(subtasks) : taskProgress;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Tasks</CardTitle>
          <span className="text-xs tabular-nums text-muted-foreground">
            {hasSubtasks
              ? `${doneCount}/${subtasks.length} completed`
              : `${barValue}% complete`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {/* Thin progress bar directly beneath the header, above the checklist. */}
        <Progress value={barValue} />

        {/* Manual progress fallback — only when there are no subtasks, so
            subtask-less tasks can still set completion. Once a subtask exists
            the bar is derived from the checklist and this control disappears. */}
        {!hasSubtasks && onSetProgress ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Decrease progress by 10"
              disabled={saving || taskProgress <= 0}
              onClick={() => onSetProgress(clampProgress(taskProgress - 10))}
            >
              <MinusIcon className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Increase progress by 10"
              disabled={saving || taskProgress >= 100}
              onClick={() => onSetProgress(clampProgress(taskProgress + 10))}
            >
              <PlusIcon className="size-4" />
            </Button>
            <Separator orientation="vertical" className="mx-1 h-6 bg-border/40" />
            {PROGRESS_PRESETS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={taskProgress === p ? "secondary" : "ghost"}
                disabled={saving}
                onClick={() => onSetProgress(p)}
              >
                {p}%
              </Button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading subtasks…</p>
        ) : subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No subtasks yet. Break this task into a checklist below.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {subtasks.map((subtask) => (
              <li
                key={subtask.id}
                className="group/subtask flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-muted/30"
              >
                <Checkbox
                  checked={subtask.done}
                  onCheckedChange={(checked) => void toggle(subtask, checked === true)}
                  aria-label={`Mark "${subtask.title}" ${subtask.done ? "incomplete" : "complete"}`}
                />
                <span
                  className={
                    "flex-1 text-sm" +
                    (subtask.done ? " text-muted-foreground line-through" : "")
                  }
                >
                  {subtask.title}
                </span>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Delete subtask "${subtask.title}"`}
                  className="opacity-0 transition-opacity group-hover/subtask:opacity-100"
                  onClick={() => void remove(subtask)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Add-subtask input */}
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
            placeholder="Add a subtask…"
            className="h-8"
          />
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Add subtask"
            disabled={adding || !draft.trim()}
            onClick={() => void add()}
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
