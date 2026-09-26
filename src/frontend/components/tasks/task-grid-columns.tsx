/**
 * @fileoverview task-grid-columns — ReUI Data Grid column definitions and row
 * model for the `/tasks` grid, adapted from the ReUI Pro blocks
 * `data-grid-expansion-1` (task title cell with completion checkbox, actions
 * menu) and `data-grid-grouping-2` (collapsible group rows with a count badge,
 * nested via TanStack `subRows`).
 *
 * Rows are a union: a `group` row (status / priority / project bucket) whose
 * `subRows` are `task` rows. With grouping off the grid is simply task rows.
 */

import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ChevronRightIcon,
  EyeIcon,
  MoreHorizontalIcon,
  SquareArrowOutUpRightIcon,
} from "lucide-react";

import { Badge } from "@/components/reui/badge";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { relativeTime, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { AssigneeAvatar, LabelChips } from "./Shared";
import { PriorityBadge } from "./PriorityBadge";
import { TASK_STATUS_DOT, TaskStatusBadge } from "./StatusBadge";
import {
  BOARD_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./types";

/** How the grid buckets rows. */
export type TaskGroupBy = "none" | "status" | "priority" | "projectId";

export const GROUP_BY_OPTIONS: { value: TaskGroupBy; label: string }[] = [
  { value: "none", label: "No grouping" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "projectId", label: "Project" },
];

/** Toggleable columns (title + actions are always shown). */
export const TOGGLEABLE_COLUMNS = [
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "project", label: "Project" },
  { key: "assignee", label: "Assignee" },
  { key: "dueDate", label: "Due" },
  { key: "updatedAt", label: "Updated" },
] as const;
export type TaskColumnKey = (typeof TOGGLEABLE_COLUMNS)[number]["key"];

export interface TaskRow {
  kind: "task";
  id: string;
  task: Task;
}
export interface TaskGroupRow {
  kind: "group";
  id: string;
  label: string;
  leading?: ReactNode;
  subRows: TaskRow[];
}
export type TaskGridRow = TaskRow | TaskGroupRow;

const PRIORITY_ORDER: TaskPriority[] = ["urgent", "high", "medium", "low"];
const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_RANK: Record<TaskStatus, number> = { todo: 0, in_progress: 1, in_review: 2, done: 3 };

/** Epoch ms for sorting a loosely-typed API date; null sorts last. */
function epoch(v: string | number | null): number {
  if (v == null) return Number.MAX_SAFE_INTEGER;
  return typeof v === "number" ? v : Date.parse(v);
}

/** Wrap tasks as rows, bucketed under group rows when `groupBy` is set. */
export function buildTaskRows(
  tasks: Task[],
  groupBy: TaskGroupBy,
  projectName: (id: string) => string | undefined,
): TaskGridRow[] {
  const rows: TaskRow[] = tasks.map((task) => ({ kind: "task", id: task.id, task }));
  if (groupBy === "none") return rows;

  const buckets: { key: string; label: string; leading?: ReactNode }[] =
    groupBy === "status"
      ? BOARD_STATUSES.map((s) => ({
          key: s,
          label: STATUS_LABELS[s],
          leading: <span aria-hidden className={cn("size-2 rounded-full", TASK_STATUS_DOT[s])} />,
        }))
      : groupBy === "priority"
        ? PRIORITY_ORDER.map((p) => ({ key: p, label: PRIORITY_LABELS[p] }))
        : [
            ...[...new Set(tasks.map((t) => t.projectId).filter((id): id is string => !!id))]
              .map((id) => ({ key: id, label: projectName(id) ?? "Unknown project" }))
              .sort((a, b) => a.label.localeCompare(b.label)),
            { key: "__none__", label: "No project" },
          ];

  const keyOf = (t: Task): string =>
    groupBy === "projectId" ? (t.projectId ?? "__none__") : String(t[groupBy]);

  return buckets
    .map<TaskGroupRow>((b) => ({
      kind: "group",
      id: `group:${b.key}`,
      label: b.label,
      leading: b.leading,
      subRows: rows.filter((r) => keyOf(r.task) === b.key),
    }))
    .filter((g) => g.subRows.length > 0);
}

export interface TaskColumnHandlers {
  projectName: (id: string) => string | undefined;
  /** Toggle done ↔ todo from the row checkbox (PATCHes status). */
  onToggleDone: (task: Task, done: boolean) => void;
  onPreview: (task: Task) => void;
  pendingIds: ReadonlySet<string>;
}

/** Group header cell: expand chevron + optional dot + label + count badge. */
function GroupCell({ row, expanded, onToggle }: { row: TaskGroupRow; expanded: boolean; onToggle: () => void }) {
  return (
    <div data-task-row="group" className="flex min-w-0 items-center gap-2">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={expanded ? `Collapse ${row.label}` : `Expand ${row.label}`}
        aria-expanded={expanded}
        className="size-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <ChevronRightIcon
          aria-hidden
          className={cn("size-3.5 transition-transform duration-150", expanded && "rotate-90")}
        />
      </Button>
      {row.leading}
      <span className="min-w-0 truncate text-sm font-semibold">{row.label}</span>
      <Badge variant="outline" className="shrink-0 tabular-nums">
        {row.subRows.length}
      </Badge>
    </div>
  );
}

/** Build the column set. Task-only cells render nothing on group rows. */
export function createTaskColumns(h: TaskColumnHandlers): ColumnDef<DataGridFeatures, TaskGridRow>[] {
  const taskOnly =
    (render: (task: Task) => ReactNode) =>
    ({ row }: { row: { original: TaskGridRow } }) =>
      row.original.kind === "task" ? render(row.original.task) : null;

  return [
    {
      id: "title",
      accessorFn: (r) => (r.kind === "task" ? r.task.title : r.label),
      header: ({ column }) => <DataGridColumnHeader title="Task" column={column} />,
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === "group") {
          return <GroupCell row={r} expanded={row.getIsExpanded()} onToggle={row.getToggleExpandedHandler()} />;
        }
        const done = r.task.status === "done";
        return (
          <div className={cn("flex min-w-0 items-start gap-2", row.depth > 0 && "pl-8")}>
            <Checkbox
              className="mt-0.5 rounded-full"
              checked={done}
              disabled={h.pendingIds.has(r.task.id)}
              onClick={(e) => e.stopPropagation()}
              onCheckedChange={(checked) => h.onToggleDone(r.task, checked === true)}
              aria-label={done ? `Mark ${r.task.title} as not done` : `Mark ${r.task.title} done`}
            />
            <div className="flex min-w-0 flex-col gap-1">
              <span
                className={cn(
                  "truncate text-sm font-medium",
                  done && "text-muted-foreground line-through decoration-current/55",
                )}
              >
                {r.task.title}
              </span>
              <LabelChips labels={r.task.labels} max={3} />
            </div>
          </div>
        );
      },
      enableHiding: false,
      minSize: 280,
      meta: { headerTitle: "Task", autoSize: true },
    },
    {
      id: "status",
      accessorFn: (r) => (r.kind === "task" ? STATUS_RANK[r.task.status] : -1),
      header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
      cell: taskOnly((t) => <TaskStatusBadge status={t.status} />),
      size: 130,
      meta: { headerTitle: "Status" },
    },
    {
      id: "priority",
      accessorFn: (r) => (r.kind === "task" ? PRIORITY_RANK[r.task.priority] : -1),
      header: ({ column }) => <DataGridColumnHeader title="Priority" column={column} />,
      cell: taskOnly((t) => <PriorityBadge priority={t.priority} />),
      size: 110,
      meta: { headerTitle: "Priority" },
    },
    {
      id: "project",
      accessorFn: (r) =>
        r.kind === "task" && r.task.projectId ? (h.projectName(r.task.projectId) ?? "") : "",
      header: ({ column }) => <DataGridColumnHeader title="Project" column={column} />,
      cell: taskOnly((t) => {
        const name = t.projectId ? h.projectName(t.projectId) : undefined;
        return name ? (
          <Badge variant="outline" className="max-w-full truncate">
            {name}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      }),
      size: 160,
      meta: { headerTitle: "Project" },
    },
    {
      id: "assignee",
      accessorFn: (r) => (r.kind === "task" ? (r.task.assignee ?? "") : ""),
      header: ({ column }) => <DataGridColumnHeader title="Assignee" column={column} />,
      cell: taskOnly((t) =>
        t.assignee ? (
          <AssigneeAvatar name={t.assignee} showName />
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        ),
      ),
      size: 160,
      meta: { headerTitle: "Assignee" },
    },
    {
      id: "dueDate",
      accessorFn: (r) => (r.kind === "task" ? epoch(r.task.dueDate) : 0),
      header: ({ column }) => <DataGridColumnHeader title="Due" column={column} />,
      cell: taskOnly((t) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {t.dueDate != null ? shortDate(t.dueDate) : "—"}
        </span>
      )),
      size: 110,
      meta: { headerTitle: "Due" },
    },
    {
      id: "updatedAt",
      accessorFn: (r) => (r.kind === "task" ? epoch(r.task.updatedAt) : 0),
      header: ({ column }) => <DataGridColumnHeader title="Updated" column={column} />,
      cell: taskOnly((t) => <span className="text-sm text-muted-foreground">{relativeTime(t.updatedAt)}</span>),
      size: 120,
      meta: { headerTitle: "Updated" },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      size: 56,
      cell: taskOnly((t) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Actions for ${t.title}`}
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreHorizontalIcon aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => h.onPreview(t)}>
                <EyeIcon className="size-4" aria-hidden />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem render={<a href={`/tasks/${t.id}`} />}>
                <SquareArrowOutUpRightIcon className="size-4" aria-hidden />
                Open full page
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )),
    },
  ];
}
