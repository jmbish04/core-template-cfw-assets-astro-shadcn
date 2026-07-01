/**
 * @fileoverview TaskSubtasks — the "Subtasks" card on the task viewport, backed
 * by the parent-child task graph (migration 0004) rather than the old
 * `task_subtasks` checklist. Every subtask is a real {@link Task} that happens
 * to be a child of the current task.
 *
 *   Children  → `GET /api/tasks/{id}/children` → `{ data: Task[] }`. Each row
 *               shows the short id (first 8 chars, monospace) + status badge +
 *               priority + title + owner (assignee avatar initials + name, or
 *               "Unassigned"). Clicking a row opens the {@link TaskPreviewDialog}
 *               quick-look, which offers "Open full page" → `/tasks/{childId}`.
 *   Header    → "Tasks {done}/{total} completed" + a progress bar derived from
 *               the children (done = child.status === "done"). When there are no
 *               children the bar falls back to the task's own `progress` and a
 *               manual −/+10 stepper + presets is shown so completion is still
 *               settable.
 *   Add-exist → {@link SubtaskLinker}: debounce typeahead over `GET /api/tasks?q`
 *               + id-paste, each linking via `PATCH /api/tasks/{id}
 *               {parentId:currentId}` then refetching children. Self / existing
 *               children / ancestors are excluded to avoid cycles; backend 400s
 *               surface inline.
 *   Create    → "Create new subtask" opens {@link TaskDialog} prefilled with
 *               `parentId = currentId`; the POST creates a pre-linked child and
 *               we refetch on save.
 *   Unlink    → per-row remove affordance → `PATCH {parentId:null}` then refetch.
 *   Gauge     → a {@link RadialGauge} renders the completion % (children done/
 *               total, or `task.progress` when childless) with a "Complete"
 *               caption.
 *
 * Because completion is derived from the children's statuses, we surface
 * `onProgressChange(progress)` so the parent viewport (board / table / sidebar)
 * stays in sync without a full refetch.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListTreeIcon, MinusIcon, PlusIcon, Unlink2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { apiGet, apiSend, ApiError } from "@/lib/api";

import { RadialGauge } from "@/components/dashboard/RadialGauge";

import { AssigneeAvatar, ErrorState } from "./Shared";
import { PriorityBadge } from "./PriorityBadge";
import { TaskStatusBadge } from "./StatusBadge";
import { SubtaskLinker } from "./SubtaskLinker";
import { TaskDialog } from "./TaskDialog";
import { TaskPreviewDialog } from "./TaskPreviewDialog";
import type { Task } from "./types";

/** Quick-set progress presets for the childless manual fallback. */
const PROGRESS_PRESETS = [0, 25, 50, 75, 100];

/** Clamp an arbitrary number into the inclusive 0–100 progress range. */
function clampProgress(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Derive the 0–100 completion percentage from a set of child tasks. */
function deriveProgress(children: Task[]): number {
  if (children.length === 0) return 0;
  const done = children.filter((c) => c.status === "done").length;
  return Math.round((done / children.length) * 100);
}

export interface TaskSubtasksProps {
  /** The current (parent) task id. */
  taskId: string;
  /**
   * The task's own `progress` (0–100). Used ONLY as the fallback bar + gauge +
   * manual control target when the task has zero children.
   */
  taskProgress: number;
  /** True while a parent PATCH is in flight (disables the manual controls). */
  saving?: boolean;
  /**
   * Called with the newly-derived 0–100 completion percentage whenever the
   * child set changes, so the parent can keep `task.progress` in sync.
   */
  onProgressChange?: (progress: number) => void;
  /**
   * PATCH the task's `progress` directly. Invoked only by the manual fallback
   * shown when there are zero children.
   */
  onSetProgress?: (progress: number) => void;
}

/** Subtasks (child-tasks) card for a single task. */
export function TaskSubtasks({
  taskId,
  taskProgress,
  saving = false,
  onProgressChange,
  onSetProgress,
}: TaskSubtasksProps) {
  const [children, setChildren] = useState<Task[]>([]);
  const [ancestorIds, setAncestorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Task | null>(null);

  /** Load the current task's direct children + ancestor ids (for cycle guard). */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [childRes, ancestorRes] = await Promise.all([
        apiGet<{ data: Task[] }>(`tasks/${taskId}/children`),
        apiGet<{ data: { id: string }[] }>(`tasks/${taskId}/ancestors`),
      ]);
      setChildren(childRes.data ?? []);
      setAncestorIds((ancestorRes.data ?? []).map((a) => a.id));
      onProgressChange?.(deriveProgress(childRes.data ?? []));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load subtasks.");
    } finally {
      setLoading(false);
    }
  }, [taskId, onProgressChange]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Unlink a child from this task (`PATCH {parentId:null}`), then refetch. */
  const unlink = useCallback(
    async (child: Task) => {
      const prev = children;
      const next = children.filter((c) => c.id !== child.id);
      setChildren(next);
      onProgressChange?.(deriveProgress(next));
      try {
        await apiSend<Task>("PATCH", `tasks/${child.id}`, { parentId: null });
      } catch (e) {
        setChildren(prev);
        onProgressChange?.(deriveProgress(prev));
        setError(e instanceof ApiError ? e.message : "Failed to remove subtask.");
      }
    },
    [children, onProgressChange],
  );

  const hasChildren = children.length > 0;
  const doneCount = useMemo(
    () => children.filter((c) => c.status === "done").length,
    [children],
  );
  // Completion: derived from children when present, else the task's own progress.
  const completion = hasChildren ? deriveProgress(children) : taskProgress;

  // Ids excluded from the linker's suggestions to avoid cycles: self, existing
  // children, and ancestors.
  const excludeIds = useMemo(
    () => new Set<string>([taskId, ...children.map((c) => c.id), ...ancestorIds]),
    [taskId, children, ancestorIds],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ListTreeIcon className="size-4 text-muted-foreground" />
            Subtasks
          </CardTitle>
          <span className="text-xs tabular-nums text-muted-foreground">
            {hasChildren ? `${doneCount}/${children.length} completed` : `${completion}% complete`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {/* Completion: progress bar + radial gauge side-by-side (gauge stacks
            below the bar on narrow viewports). */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col gap-2">
            <Progress value={completion} />
            {/* Manual progress fallback — only when there are no children. */}
            {!hasChildren && onSetProgress ? (
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
          </div>
          <div className="w-full max-w-[150px] shrink-0 self-center sm:w-[150px]">
            <RadialGauge
              value={completion}
              max={100}
              label="Completion"
              caption="Complete"
              chartKey="chart-2"
              className="mx-auto aspect-square max-h-[150px]"
            />
          </div>
        </div>

        <Separator className="bg-border/40" />

        {/* Child list. Clicking a row opens the quick-look preview. */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading subtasks…</p>
        ) : !hasChildren ? (
          <p className="text-sm text-muted-foreground">
            No subtasks yet. Link an existing task or create a new one below.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/40">
            {children.map((child) => (
              <li
                key={child.id}
                className="group/child flex items-center gap-2.5 py-2 first:pt-0 last:pb-0"
              >
                <button
                  type="button"
                  onClick={() => setPreview(child)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 py-0.5 text-left hover:bg-muted/30"
                  aria-label={`Preview subtask "${child.title}"`}
                >
                  {/* Short id (first 8 chars, monospace) for quick reference. */}
                  <code
                    className="hidden shrink-0 rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline"
                    title={child.id}
                  >
                    {child.id.slice(0, 8)}
                  </code>
                  <TaskStatusBadge status={child.status} className="shrink-0" />
                  <PriorityBadge priority={child.priority} className="shrink-0" />
                  <span
                    className={
                      "min-w-0 flex-1 truncate text-sm" +
                      (child.status === "done" ? " text-muted-foreground line-through" : "")
                    }
                  >
                    {child.title}
                  </span>
                  {/* Owner (assignee): avatar initials + name, or "Unassigned". */}
                  <AssigneeAvatar
                    name={child.assignee}
                    showName
                    className="ml-auto hidden max-w-[9rem] shrink-0 md:flex"
                  />
                </button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Remove "${child.title}" from subtasks`}
                  className="opacity-0 transition-opacity group-hover/child:opacity-100"
                  onClick={() => void unlink(child)}
                >
                  <Unlink2Icon className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Add existing (typeahead + id paste). */}
        <SubtaskLinker
          taskId={taskId}
          excludeIds={excludeIds}
          onLinked={() => void load()}
          onError={(msg) => setError(msg || null)}
        />

        {/* Create new subtask (pre-linked child via TaskDialog parentId). */}
        <TaskDialog
          parentId={taskId}
          onSaved={() => void load()}
          trigger={
            <Button variant="outline" size="sm" className="self-start">
              <PlusIcon className="size-4" />
              Create new subtask
            </Button>
          }
        />
      </CardContent>

      {/* Quick-look preview for a clicked child → "Open full page" → /tasks/{id}. */}
      <TaskPreviewDialog
        task={preview}
        open={preview !== null}
        onOpenChange={(o) => !o && setPreview(null)}
        onSaved={(updated) => {
          setChildren((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setPreview(updated);
        }}
      />
    </Card>
  );
}
