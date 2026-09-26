/**
 * @fileoverview OpenTasksGrid — the action layer of /dashboard.
 *
 * Adapted from the ReUI Pro `data-grid-base-7` block (modules grid with
 * progress rings, status badges and row actions). Kept: the DataGrid +
 * `useTable({ features: dataGridFeatures })` wiring, the toolbar (search
 * InputGroup, sort dropdown, collapsed checkbox filter dropdown), the
 * progress-ring / two-line name cells, status Badges and DataGridPagination.
 * Changed: rows are real open tasks from `GET /api/tasks` (sorted by due date,
 * overdue flagged), the filter facet is priority, the row action opens
 * `/tasks/{id}`, and there is no toast / mock mutation. Below `sm` the grid is
 * replaced by a two-column summary list linking to each task (no horizontal
 * scroll on phones).
 */

"use client";

import { useMemo, useState, type ComponentProps } from "react";
import { useTable, type ColumnDef, type PaginationState, type SortingState } from "@tanstack/react-table";
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FilterIcon,
  ListTodoIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/reui/badge";
import { DataGrid, dataGridFeatures, type DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Frame, FramePanel } from "@/components/reui/frame";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/components/tasks/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { relativeTime, shortDate } from "@/lib/format";

import { EmptyState, InlineError, ProgressRing } from "./shared";
import type { OpenTasks, Resource } from "./useDashboardData";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

/** One grid row: a task flattened with its project name and due-date facts. */
interface TaskRow {
  id: string;
  title: string;
  project: string;
  assignee: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  /** Epoch ms, or null when the task has no due date. */
  due: number | null;
  overdue: boolean;
}

type SortKey = "due" | "priority" | "progress" | "title";

const SORT_LABELS: Record<SortKey, string> = {
  due: "Due date",
  priority: "Priority",
  progress: "Progress",
  title: "Title",
};

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];

const PRIORITY_VARIANT: Record<TaskPriority, BadgeVariant> = {
  urgent: "destructive-light",
  high: "warning-light",
  medium: "info-light",
  low: "outline",
};

const STATUS_VARIANT: Record<TaskStatus, BadgeVariant> = {
  todo: "outline",
  in_progress: "info-outline",
  in_review: "warning-outline",
  done: "success-outline",
};

function toMs(v: string | number | null): number | null {
  if (v === null) return null;
  const ms = typeof v === "number" ? v : new Date(v).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function DueCell({ row }: { row: TaskRow }) {
  if (row.due === null) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-foreground text-sm font-medium tabular-nums">{shortDate(row.due)}</span>
      {row.overdue ? (
        <Badge variant="destructive-light" size="sm" className="w-fit">
          Overdue {relativeTime(row.due)}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs">{relativeTime(row.due)}</span>
      )}
    </div>
  );
}

function buildColumns(): ColumnDef<DataGridFeatures, TaskRow>[] {
  const header: ColumnDef<DataGridFeatures, TaskRow>["header"] = ({ column }) => (
    <DataGridColumnHeader column={column} visibility={true} />
  );
  return [
    {
      accessorKey: "progress",
      id: "progress",
      header,
      cell: ({ row }) => <ProgressRing value={row.original.progress} />,
      size: 72,
      enableSorting: true,
      meta: { headerTitle: "Progress" },
    },
    {
      accessorKey: "title",
      id: "title",
      header,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-1">
          <a href={`/tasks/${row.original.id}`} className="text-foreground truncate text-sm leading-5 font-medium hover:underline">
            {row.original.title}
          </a>
          <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
            <span className="truncate">{row.original.project}</span>
            <span className="bg-muted-foreground/45 size-1 shrink-0 rounded-full" aria-hidden="true" />
            <span className="truncate">{row.original.assignee ?? "Unassigned"}</span>
          </div>
        </div>
      ),
      minSize: 260,
      enableSorting: true,
      meta: { autoSize: true, headerTitle: "Task" },
    },
    {
      accessorKey: "due",
      id: "due",
      header,
      cell: ({ row }) => <DueCell row={row.original} />,
      // Undated tasks sort last.
      sortFn: (a, b) => (a.original.due ?? Infinity) - (b.original.due ?? Infinity),
      size: 170,
      enableSorting: true,
      meta: { headerTitle: "Due" },
    },
    {
      accessorKey: "priority",
      id: "priority",
      header,
      cell: ({ row }) => (
        <Badge variant={PRIORITY_VARIANT[row.original.priority]}>{PRIORITY_LABELS[row.original.priority]}</Badge>
      ),
      sortFn: (a, b) => PRIORITY_RANK[a.original.priority] - PRIORITY_RANK[b.original.priority],
      size: 110,
      enableSorting: true,
      meta: { headerTitle: "Priority" },
    },
    {
      accessorKey: "status",
      id: "status",
      header,
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{STATUS_LABELS[row.original.status]}</Badge>,
      size: 126,
      enableSorting: true,
      meta: { headerTitle: "Status" },
    },
    {
      id: "actions",
      header,
      cell: ({ row }) => (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Open ${row.original.title}`}
          render={<a href={`/tasks/${row.original.id}`} />}
          nativeButton={false}
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      ),
      size: 56,
      enableSorting: false,
      meta: { headerTitle: "" },
    },
  ];
}

export function OpenTasksGrid({ resource }: { resource: Resource<OpenTasks> }) {
  const { data, loading, error, reload } = resource;
  const [search, setSearch] = useState("");
  const [priorities, setPriorities] = useState<TaskPriority[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("due");
  const [sorting, setSorting] = useState<SortingState>([{ id: "due", desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });

  const allRows = useMemo<TaskRow[]>(() => {
    if (!data) return [];
    const projectName = new Map(data.projects.map((p) => [p.id, p.name]));
    const now = Date.now();
    return data.tasks.map((t) => {
      const due = toMs(t.dueDate);
      return {
        id: t.id,
        title: t.title,
        project: (t.projectId && projectName.get(t.projectId)) || "No project",
        assignee: t.assignee,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        due,
        overdue: due !== null && due < now && t.status !== "done",
      };
    });
  }, [data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        (priorities.length === 0 || priorities.includes(r.priority)) &&
        (q === "" || `${r.title} ${r.project} ${r.assignee ?? ""}`.toLowerCase().includes(q)),
    );
  }, [allRows, search, priorities]);

  const overdueCount = allRows.filter((r) => r.overdue).length;
  const columns = useMemo(buildColumns, []);
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useTable({
    features: dataGridFeatures,
    data: rows,
    columns,
    pageCount: Math.ceil(rows.length / pagination.pageSize),
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
  });

  // Mobile summary list mirrors the grid's current sort + filters.
  const sortedRows = table.getSortedRowModel().rows.map((r) => r.original);

  return (
    <Frame className="w-full" spacing="sm">
      <FramePanel className="p-0!">
        <DataGrid
          table={table}
          recordCount={rows.length}
          emptyMessage="No open tasks match these filters."
          tableLayout={{
            dense: true,
            rowBorder: true,
            headerSticky: false,
            columnsVisibility: false,
            columnsResizable: false,
            columnsMovable: false,
            width: "fixed",
          }}
          tableClassNames={{ bodyRow: "[&>td]:h-16" }}
        >
          <div className="flex w-full flex-col">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:min-h-14 lg:flex-row lg:items-center lg:gap-4 lg:py-0">
              <div className="flex min-w-0 items-center gap-2">
                <ListTodoIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <h2 className="text-foreground truncate text-sm font-medium">Open tasks</h2>
                {overdueCount > 0 ? (
                  <Badge variant="destructive-light" radius="full">
                    {overdueCount} overdue
                  </Badge>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto lg:flex-nowrap">
                <InputGroup className="w-full min-w-40 sm:w-48">
                  <InputGroupAddon align="inline-start">
                    <SearchIcon className="text-muted-foreground size-4" aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      resetPage();
                    }}
                    placeholder="Filter open tasks…"
                    aria-label="Filter open tasks"
                  />
                  {search ? (
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton size="icon-xs" aria-label="Clear filter" onClick={() => setSearch("")}>
                        <XIcon className="size-4" aria-hidden="true" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  ) : null}
                </InputGroup>

                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    render={
                      <Button type="button" variant="outline">
                        <ArrowUpDownIcon data-icon="inline-start" aria-hidden="true" />
                        {SORT_LABELS[sortBy]}
                        <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuGroup>
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                        <DropdownMenuItem
                          key={key}
                          onClick={() => {
                            setSortBy(key);
                            setSorting([{ id: key, desc: key === "progress" }]);
                            resetPage();
                          }}
                        >
                          {SORT_LABELS[key]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    render={
                      <Button type="button" variant="outline">
                        <FilterIcon data-icon="inline-start" aria-hidden="true" />
                        Priority
                        {priorities.length > 0 ? (
                          <Badge variant="outline" radius="full">
                            {priorities.length}
                          </Badge>
                        ) : null}
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="min-w-48">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Priority</DropdownMenuLabel>
                      {PRIORITIES.map((p) => (
                        <DropdownMenuCheckboxItem
                          key={p}
                          checked={priorities.includes(p)}
                          closeOnClick={false}
                          onCheckedChange={(checked) => {
                            setPriorities((cur) => (checked ? [...cur, p] : cur.filter((x) => x !== p)));
                            resetPage();
                          }}
                        >
                          {PRIORITY_LABELS[p]}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                    {priorities.length > 0 ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem closeOnClick={false} onClick={() => setPriorities([])}>
                          Reset filters
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {error ? (
              <InlineError className="m-4" message={error} onRetry={reload} />
            ) : loading && !data ? (
              <div className="flex flex-col gap-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : allRows.length === 0 ? (
              <EmptyState className="m-4" label="No open tasks — nothing needs action." />
            ) : (
              <>
                {/* Mobile: two-column summary list linking to the task. */}
                <ul className="divide-border/60 divide-y sm:hidden">
                  {sortedRows.slice(0, 10).map((r) => (
                    <li key={r.id}>
                      <a href={`/tasks/${r.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                        <span className="min-w-0">
                          <span className="text-foreground block truncate text-sm font-medium">{r.title}</span>
                          <span className="text-muted-foreground block truncate text-xs">{r.project}</span>
                        </span>
                        <span className="text-end text-xs">
                          {r.overdue ? (
                            <Badge variant="destructive-light" size="sm">
                              Overdue
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground tabular-nums">{r.due ? shortDate(r.due) : "—"}</span>
                          )}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>

                <div className="hidden sm:block">
                  <DataGridScrollArea>
                    <DataGridTable />
                  </DataGridScrollArea>
                  <div className="border-t px-4 py-3">
                    <DataGridPagination sizes={[5, 10, 25]} info="{from} - {to} of {count} tasks" className="py-0" />
                  </div>
                </div>
              </>
            )}
          </div>
        </DataGrid>
      </FramePanel>
    </Frame>
  );
}
