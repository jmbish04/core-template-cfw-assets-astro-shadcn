/**
 * @fileoverview TaskList — the `/tasks` island (hextaui task-list + task-filters).
 * Renders a filterable, server-sorted `<Table>` of tasks from `GET /api/tasks`.
 *
 * Features:
 *   - Faceted, multi-select TaskFilters bar (search, status[], priority[],
 *     project[], assignee[], label[], sort). Multi-values are serialized as
 *     comma-separated query params (e.g. `?status=todo,in_review`).
 *   - Inline status + priority editing via Select → `PATCH /api/tasks/{id}`
 *   - Clicking a row opens a fast preview MODAL (TaskPreviewDialog) with an
 *     "Open full page" link to `/tasks/{id}`. Action controls inside the row
 *     (status/priority selects) stopPropagation so they don't open the modal.
 *   - "New task" Dialog (TaskDialog) → `POST /api/tasks`
 *
 * The initial `projectId` filter can be seeded from the URL (`?projectId=`) so
 * a project card on `/projects` can deep-link straight into a filtered list.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { shortDate, relativeTime } from "@/lib/format";

import { AssigneeAvatar, EmptyState, ErrorState, LabelChips } from "./Shared";
import { TaskDialog } from "./TaskDialog";
import { TaskPreviewDialog } from "./TaskPreviewDialog";
import {
  TaskFilters,
  activeFilterCount,
  emptyTaskQuery,
  type TaskQuery,
} from "./TaskFilters";
import { useProjects } from "./useProjects";
import {
  BOARD_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type ListEnvelope,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

export interface TaskListProps {
  /** Optional initial project filter (seeded from `?projectId=` on the page). */
  initialProjectId?: string;
}

export function TaskList({ initialProjectId }: TaskListProps) {
  const [query, setQuery] = useState<TaskQuery>(() => emptyTaskQuery(initialProjectId));
  const [debouncedQ, setDebouncedQ] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Preview modal state.
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { nameById } = useProjects();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.q), 300);
    return () => clearTimeout(t);
  }, [query.q]);

  // Stable CSV keys so the load callback only re-fires when selections change.
  const statusKey = query.status.join(",");
  const priorityKey = query.priority.join(",");
  const projectKey = query.projectId.join(",");
  const assigneeKey = query.assignee.join(",");
  const labelKey = query.label.join(",");

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<ListEnvelope<Task>>("tasks", {
        q: debouncedQ || undefined,
        status: statusKey || undefined,
        priority: priorityKey || undefined,
        projectId: projectKey || undefined,
        assignee: assigneeKey || undefined,
        label: labelKey || undefined,
        sort: query.sort,
        limit: 100,
      });
      if (id !== reqId.current) return;
      setTasks(res.data);
      setTotal(res.total);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof ApiError ? e.message : "Failed to load tasks.");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [debouncedQ, statusKey, priorityKey, projectKey, assigneeKey, labelKey, query.sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchField = useCallback(
    async (task: Task, patch: Partial<Pick<Task, "status" | "priority">>) => {
      setPendingId(task.id);
      const prev = { status: task.status, priority: task.priority };
      setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
      try {
        await apiSend<Task>("PATCH", `tasks/${task.id}`, patch);
      } catch (e) {
        setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, ...prev } : t)));
        setError(e instanceof ApiError ? e.message : "Failed to update task.");
      } finally {
        setPendingId(null);
      }
    },
    [],
  );

  const handleCreated = useCallback((task: Task) => {
    setTasks((prev) => [task, ...prev]);
    setTotal((t) => t + 1);
  }, []);

  // Apply an edit from the preview modal back into the list.
  const handleUpdated = useCallback((task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    setPreviewTask(task);
  }, []);

  const onChange = useCallback((patch: Partial<TaskQuery>) => {
    setQuery((q) => ({ ...q, ...patch }));
  }, []);

  const onClear = useCallback(() => setQuery(emptyTaskQuery()), []);

  const openPreview = useCallback((task: Task) => {
    setPreviewTask(task);
    setPreviewOpen(true);
  }, []);

  const hasFilters = useMemo(
    () => activeFilterCount({ ...query, q: debouncedQ }) > 0,
    [debouncedQ, query],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[16rem] flex-1">
          <TaskFilters value={query} onChange={onChange} onClear={onClear} />
        </div>
        <TaskDialog
          onSaved={handleCreated}
          defaultProjectId={query.projectId[0]}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              New task
            </Button>
          }
        />
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<PlusIcon />}
          title={hasFilters ? "No tasks match your filters" : "No tasks yet"}
          description={
            hasFilters
              ? "Adjust or clear the filters to see more tasks."
              : "Create a task to get started."
          }
          action={
            <TaskDialog
              onSaved={handleCreated}
              trigger={
                <Button variant="outline">
                  <PlusIcon className="size-4" />
                  New task
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-border/40">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="min-w-[16rem]">Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={cn(
                    "cursor-pointer border-border/40 transition-colors hover:bg-muted/40",
                  )}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open task ${task.title}`}
                  onClick={() => openPreview(task)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openPreview(task);
                    }
                  }}
                >
                  <TableCell className="max-w-[22rem]">
                    <span className="font-medium">{task.title}</span>
                    <LabelChips labels={task.labels} max={3} className="mt-1" />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={task.status}
                      onValueChange={(v) => patchField(task, { status: v as TaskStatus })}
                    >
                      <SelectTrigger size="sm" disabled={pendingId === task.id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOARD_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={task.priority}
                      onValueChange={(v) => patchField(task, { priority: v as TaskPriority })}
                    >
                      <SelectTrigger size="sm" disabled={pendingId === task.id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_LABELS[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.projectId ? (nameById.get(task.projectId) ?? "—") : "—"}
                  </TableCell>
                  <TableCell>
                    {task.assignee ? (
                      <AssigneeAvatar name={task.assignee} showName />
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.dueDate != null ? shortDate(task.dueDate) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {relativeTime(task.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && tasks.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {tasks.length} of {total} {total === 1 ? "task" : "tasks"}
        </p>
      ) : null}

      <TaskPreviewDialog
        task={previewTask}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        projectName={previewTask?.projectId ? nameById.get(previewTask.projectId) : null}
        onSaved={handleUpdated}
      />
    </div>
  );
}
