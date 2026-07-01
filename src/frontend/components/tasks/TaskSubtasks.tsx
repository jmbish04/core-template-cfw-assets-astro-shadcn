/**
 * @fileoverview TaskSubtasks — the real Subtasks checklist for the task
 * viewport, backed by `GET/POST/PATCH/DELETE /api/tasks/{id}/subtasks`.
 *
 * Each row is a Base-UI Checkbox + label (strikethrough + muted when done) with
 * a hover delete button. A "{done}/{total} completed" summary + progress bar are
 * derived purely from the subtask rows. Because the server re-derives the parent
 * task's `progress` from these rows on every mutation, we surface an
 * `onProgressChange(progress)` callback so the parent viewport (and thus the
 * Completion card / board / table) stays in sync without a full refetch.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { apiGet, apiSend, ApiError } from "@/lib/api";

import { ErrorState } from "./Shared";
import type { TaskSubtask } from "./types";

export interface TaskSubtasksProps {
  taskId: string;
  /**
   * Called with the newly-derived 0–100 completion percentage whenever the
   * subtask set changes, so the parent can keep `task.progress` in sync with
   * what the server just computed.
   */
  onProgressChange?: (progress: number) => void;
}

/** Derive the 0–100 completion percentage from a set of subtasks. */
function deriveProgress(subtasks: TaskSubtask[]): number {
  if (subtasks.length === 0) return 0;
  const done = subtasks.filter((s) => s.done).length;
  return Math.round((done / subtasks.length) * 100);
}

/** Subtasks checklist card for a single task. */
export function TaskSubtasks({ taskId, onProgressChange }: TaskSubtasksProps) {
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

  const doneCount = subtasks.filter((s) => s.done).length;
  const progress = deriveProgress(subtasks);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Subtasks</CardTitle>
          {subtasks.length > 0 ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {doneCount}/{subtasks.length} completed
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {subtasks.length > 0 ? <Progress value={progress} /> : null}

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
