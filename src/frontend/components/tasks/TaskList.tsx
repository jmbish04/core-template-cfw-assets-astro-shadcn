/**
 * @fileoverview TaskList — the `/tasks` island, adapted from the ReUI Pro block
 * `data-grid-expansion-1` (Frame + tabs + Filters + settings popover + Data
 * Grid + pagination) with group rows from `data-grid-grouping-2`.
 *
 *   - Data: `GET /api/tasks` (limit 200). `?q=` comes from the search box; the
 *     positive AND rules of the Filters query go to the API as `status` /
 *     `priority` / `projectId` / `assignee` / `label` params, and the whole tree
 *     (OR groups, negations) is re-applied client-side — see task-filtering.
 *   - Grid: ReUI Data Grid with client sorting (column headers), pagination,
 *     column visibility, density, and optional grouping by status / priority /
 *     project (collapsible group rows, all expanded by default).
 *   - Row click → TaskPreviewDialog; the row menu links to `/tasks/{id}`; the
 *     row checkbox toggles done ↔ todo via `PATCH /api/tasks/{id}`.
 *   - Mobile (<768px): the grid is replaced by a dense summary list (title +
 *     status) that opens the same preview — no horizontal-scrolling table.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useTable,
  type ColumnVisibilityState,
  type ExpandedState,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  CheckIcon,
  FilterIcon,
  FunnelXIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
} from "lucide-react";

import { DataGrid, dataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Filters } from "@/components/reui/filters/filters";
import { countFilterRules } from "@/components/reui/filters/filters-query";
import type { FilterQuery } from "@/components/reui/filters/filters-types";
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

import { ErrorState } from "./Shared";
import { TaskStatusBadge } from "./StatusBadge";
import { TaskDialog } from "./TaskDialog";
import { TaskPreviewDialog } from "./TaskPreviewDialog";
import {
  buildTaskFilterFields,
  initialTaskQuery,
  matchesQuery,
  toServerParams,
} from "./task-filtering";
import {
  buildTaskRows,
  createTaskColumns,
  GROUP_BY_OPTIONS,
  TOGGLEABLE_COLUMNS,
  type TaskColumnKey,
  type TaskGridRow,
  type TaskGroupBy,
} from "./task-grid-columns";
import { useProjects } from "./useProjects";
import { useTaskFacets } from "./useTaskFacets";
import type { ListEnvelope, Task } from "./types";

type TaskTab = "all" | "open" | "done";
const TABS: { value: TaskTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
];

type Density = "compact" | "comfortable";
const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

function inTab(task: Task, tab: TaskTab): boolean {
  if (tab === "open") return task.status !== "done";
  if (tab === "done") return task.status === "done";
  return true;
}

export interface TaskListProps {
  /** Optional initial project filter (seeded from `?projectId=` on the page). */
  initialProjectId?: string;
  /** Optional initial search (seeded from `?q=` on the page). */
  initialQ?: string;
}

export function TaskList({ initialProjectId, initialQ }: TaskListProps) {
  const [q, setQ] = useState(initialQ ?? "");
  const [debouncedQ, setDebouncedQ] = useState(initialQ ?? "");
  const [filterQuery, setFilterQuery] = useState<FilterQuery>(() =>
    initialTaskQuery(initialProjectId),
  );
  const [tab, setTab] = useState<TaskTab>("all");
  const [groupBy, setGroupBy] = useState<TaskGroupBy>("none");
  const [density, setDensity] = useState<Density>("comfortable");
  const [visibleCols, setVisibleCols] = useState<Record<TaskColumnKey, boolean>>({
    status: true,
    priority: true,
    project: true,
    assignee: true,
    dueDate: true,
    updatedAt: false,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [expanded, setExpanded] = useState<ExpandedState>(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { options: projectOptions, nameById } = useProjects();
  const { assignees, labels } = useTaskFacets();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Stable string key so the fetch only re-runs when the server params change.
  const serverKey = JSON.stringify(toServerParams(filterQuery));

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<ListEnvelope<Task>>("tasks", {
        ...(JSON.parse(serverKey) as Record<string, string>),
        q: debouncedQ || undefined,
        limit: 200,
      });
      if (id !== reqId.current) return;
      setTasks(res.data);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(
        e instanceof ApiError
          ? `Couldn't load tasks: ${e.message}. Try again.`
          : "Couldn't load tasks. Check your connection and try again.",
      );
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [debouncedQ, serverKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => tasks.filter((t) => matchesQuery(t, filterQuery)),
    [tasks, filterQuery],
  );
  const visible = useMemo(() => filtered.filter((t) => inTab(t, tab)), [filtered, tab]);

  // Back to page 1 whenever the visible set changes shape.
  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [visible.length, groupBy, tab]);

  const projectName = useCallback((id: string) => nameById.get(id), [nameById]);

  const openPreview = useCallback((task: Task) => {
    setPreviewTask(task);
    setPreviewOpen(true);
  }, []);

  const replaceTask = useCallback((task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }, []);

  const toggleDone = useCallback(
    async (task: Task, done: boolean) => {
      const body: Partial<Task> = done ? { status: "done", progress: 100 } : { status: "todo" };
      setPendingIds((s) => new Set(s).add(task.id));
      replaceTask({ ...task, ...body });
      try {
        replaceTask(await apiSend<Task>("PATCH", `tasks/${task.id}`, body));
      } catch (e) {
        replaceTask(task);
        setError(
          `Couldn't update “${task.title}”${e instanceof ApiError ? `: ${e.message}` : ""}. Try again.`,
        );
      } finally {
        setPendingIds((s) => {
          const next = new Set(s);
          next.delete(task.id);
          return next;
        });
      }
    },
    [replaceTask],
  );

  const handleCreated = useCallback((task: Task) => setTasks((prev) => [task, ...prev]), []);
  const handleUpdated = useCallback(
    (task: Task) => {
      replaceTask(task);
      setPreviewTask(task);
    },
    [replaceTask],
  );

  const rows = useMemo(
    () => buildTaskRows(visible, groupBy, projectName),
    [visible, groupBy, projectName],
  );
  const columns = useMemo(
    () => createTaskColumns({ projectName, onToggleDone: toggleDone, onPreview: openPreview, pendingIds }),
    [projectName, toggleDone, openPreview, pendingIds],
  );
  const columnVisibility = useMemo<ColumnVisibilityState>(
    () => ({ ...visibleCols }),
    [visibleCols],
  );

  const grouped = groupBy !== "none";
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (row) => row.id,
    getSubRows: (row) => (row.kind === "group" ? (row.subRows as TaskGridRow[]) : undefined),
    getRowCanExpand: (row) => row.original.kind === "group",
    state: { sorting, pagination, columnVisibility, expanded },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    // Grouped view renders every bucket in full; flat view pages client-side.
    manualPagination: grouped,
  });

  const filterFields = useMemo(
    () => buildTaskFilterFields({ projects: projectOptions, assignees, labels }),
    [projectOptions, assignees, labels],
  );
  const ruleCount = countFilterRules(filterQuery);
  const hasFilters = ruleCount > 0 || debouncedQ.trim() !== "";
  const tabCount = (t: TaskTab) => filtered.filter((task) => inTab(task, t)).length;

  const newTaskButton = (
    <TaskDialog
      onSaved={handleCreated}
      defaultProjectId={initialProjectId}
      trigger={
        <Button>
          <PlusIcon className="size-4" aria-hidden />
          New task
        </Button>
      }
    />
  );

  return (
    <DataGrid
      table={table}
      recordCount={grouped ? visible.length : rows.length}
      isLoading={loading}
      emptyMessage={
        hasFilters
          ? "No tasks match these filters. Clear the filters or switch tabs."
          : "No tasks yet. Create one with New task."
      }
      onRowClick={(row: TaskGridRow) => {
        if (row.kind === "task") openPreview(row.task);
      }}
      tableLayout={{
        headerSticky: true,
        columnsResizable: true,
        dense: density === "compact",
      }}
    >
      <Frame dense spacing="sm" className="w-full">
        <FrameHeader className="flex-row items-center justify-between gap-3">
          <div className="flex flex-col gap-px">
            <FrameTitle>All tasks</FrameTitle>
            <FrameDescription className="text-xs">
              {visible.length} {visible.length === 1 ? "task" : "tasks"}
              {ruleCount > 0 ? ` · ${ruleCount} ${ruleCount === 1 ? "filter" : "filters"}` : ""}
            </FrameDescription>
          </div>
          {newTaskButton}
        </FrameHeader>

        <FramePanel className="p-0 shadow-none!">
          <div className="px-(--frame-panel-header-px) pt-(--frame-panel-header-py)">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TaskTab)}>
              <TabsList variant="line" className="gap-5">
                {TABS.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="gap-2 px-0 pt-0 pb-(--frame-panel-header-py) text-sm"
                  >
                    <span>{t.label}</span>
                    <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums">
                      {tabCount(t.value)}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2 px-(--frame-panel-header-px) py-2.5">
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <SearchIcon className="size-4" aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title and description…"
                aria-label="Search tasks"
              />
            </InputGroup>

            <Filters
              query={filterQuery}
              fields={filterFields}
              onQueryChange={setFilterQuery}
              trigger={
                <Button type="button" variant="outline" aria-label="Add filter">
                  <FilterIcon className="size-4" aria-hidden />
                  Filter
                </Button>
              }
            />

            <div className="ml-auto flex items-center gap-2">
              {hasFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFilterQuery(initialTaskQuery());
                    setQ("");
                  }}
                >
                  <FunnelXIcon className="size-4" aria-hidden />
                  Clear
                </Button>
              ) : null}
              <Popover>
                <PopoverTrigger
                  render={
                    <Button type="button" variant="outline" className="max-md:hidden">
                      <Settings2Icon className="size-4" aria-hidden />
                      View
                    </Button>
                  }
                />
                <PopoverContent align="end" className="w-[320px] p-0">
                  <FieldGroup className="gap-3 px-3.5 py-3">
                    <Field orientation="horizontal" className="min-h-9 items-center justify-between gap-3">
                      <FieldLabel className="text-sm font-normal">Group by</FieldLabel>
                      <Select
                        value={groupBy}
                        onValueChange={(v) => {
                          setGroupBy(v as TaskGroupBy);
                          setExpanded(true);
                        }}
                        items={GROUP_BY_OPTIONS}
                      >
                        <SelectTrigger size="sm" className="w-[140px] shrink-0">
                          <SelectValue placeholder="Choose grouping" />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectGroup>
                            {GROUP_BY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field orientation="horizontal" className="min-h-9 items-center justify-between gap-3">
                      <FieldLabel className="text-sm font-normal">Density</FieldLabel>
                      <Select
                        value={density}
                        onValueChange={(v) => setDensity(v as Density)}
                        items={DENSITY_OPTIONS}
                      >
                        <SelectTrigger size="sm" className="w-[140px] shrink-0">
                          <SelectValue placeholder="Choose density" />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectGroup>
                            {DENSITY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <FieldSeparator className="-mx-3.5" />

                    <div className="flex flex-col gap-2.5">
                      <div className="text-xs font-medium text-muted-foreground">Columns</div>
                      <div className="flex flex-wrap gap-1.5">
                        {TOGGLEABLE_COLUMNS.map((col) => {
                          const on = visibleCols[col.key];
                          return (
                            <Button
                              key={col.key}
                              type="button"
                              size="xs"
                              variant={on ? "secondary" : "outline"}
                              className="rounded-full"
                              aria-pressed={on}
                              onClick={() => setVisibleCols((c) => ({ ...c, [col.key]: !c[col.key] }))}
                            >
                              {on ? <CheckIcon aria-hidden /> : null}
                              {col.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </FieldGroup>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {error ? <ErrorState message={error} onRetry={load} className="mx-3 mb-3" /> : null}

          <Separator />

          {/* Desktop / tablet: the grid. */}
          <div className="max-md:hidden">
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
            {grouped ? null : (
              <>
                <Separator />
                <FrameFooter>
                  <DataGridPagination sizes={[10, 25, 50, 100]} />
                </FrameFooter>
              </>
            )}
          </div>

          {/* Mobile: dense summary list linking to the preview. */}
          <ul className="md:hidden divide-y divide-border">
            {loading ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Loading tasks…</li>
            ) : visible.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                {hasFilters ? "No tasks match these filters." : "No tasks yet."}
              </li>
            ) : (
              visible.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => openPreview(task)}
                    className={cn(
                      "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left",
                      "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
                    )}
                  >
                    <span className="truncate text-sm font-medium">{task.title}</span>
                    <TaskStatusBadge status={task.status} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </FramePanel>
      </Frame>

      <TaskPreviewDialog
        task={previewTask}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        projectName={previewTask?.projectId ? nameById.get(previewTask.projectId) : null}
        onSaved={handleUpdated}
      />
    </DataGrid>
  );
}
