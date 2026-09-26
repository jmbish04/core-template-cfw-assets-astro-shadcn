/**
 * @fileoverview ProjectProgressGrid — per-project completion grid for /analytics.
 *
 * Adapted from the ReUI Pro `data-grid-base-7` block, which is literally a
 * "modules with progress rings, task counts and status badges" grid. Kept:
 * the DataGrid wiring, progress-ring + two-line name cells, status Badge,
 * search InputGroup, collapsed status filter dropdown and pagination.
 * Changed: rows are real projects with done/total counts aggregated from
 * `GET /api/tasks`; the row action opens `/tasks?projectId=…`. Below `sm` it
 * becomes a two-column summary list.
 */

"use client";

import { useMemo, useState, type ComponentProps } from "react";
import { useTable, type ColumnDef, type PaginationState, type SortingState } from "@tanstack/react-table";
import { ChevronRightIcon, FilterIcon, FolderKanbanIcon, SearchIcon } from "lucide-react";

import { Badge } from "@/components/reui/badge";
import { DataGrid, dataGridFeatures, type DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Frame, FramePanel } from "@/components/reui/frame";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/components/tasks/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

import { ProgressRing } from "./shared";

/** One row: a project with aggregated task counts. */
export interface ProjectRow {
  id: string;
  name: string;
  owner: string;
  status: ProjectStatus;
  done: number;
  total: number;
  pct: number;
}

const STATUS_VARIANT: Record<ProjectStatus, ComponentProps<typeof Badge>["variant"]> = {
  active: "success-outline",
  on_hold: "warning-outline",
  archived: "outline",
};
const STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];

const href = (id: string) => `/tasks?projectId=${encodeURIComponent(id)}`;

function buildColumns(): ColumnDef<DataGridFeatures, ProjectRow>[] {
  const header: ColumnDef<DataGridFeatures, ProjectRow>["header"] = ({ column }) => (
    <DataGridColumnHeader column={column} visibility={true} />
  );
  return [
    {
      accessorKey: "pct",
      id: "pct",
      header,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <ProgressRing value={row.original.pct} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-foreground text-sm font-medium tabular-nums">{row.original.pct}% done</span>
            <span className="text-muted-foreground truncate text-xs tabular-nums">
              {row.original.done}/{row.original.total} tasks
            </span>
          </div>
        </div>
      ),
      size: 190,
      enableSorting: true,
      meta: { headerTitle: "Progress" },
    },
    {
      accessorKey: "name",
      id: "name",
      header,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-1">
          <a href={href(row.original.id)} className="text-foreground truncate text-sm font-medium hover:underline">
            {row.original.name}
          </a>
          <span className="text-muted-foreground truncate text-xs">{row.original.owner || "—"}</span>
        </div>
      ),
      minSize: 260,
      enableSorting: true,
      meta: { autoSize: true, headerTitle: "Project" },
    },
    {
      accessorKey: "total",
      id: "total",
      header,
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.total.toLocaleString()}</span>,
      size: 100,
      enableSorting: true,
      meta: { headerTitle: "Tasks" },
    },
    {
      accessorKey: "status",
      id: "status",
      header,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>{PROJECT_STATUS_LABELS[row.original.status]}</Badge>
      ),
      size: 120,
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
          aria-label={`Open ${row.original.name} tasks`}
          render={<a href={href(row.original.id)} />}
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

export function ProjectProgressGrid({ rows: allRows }: { rows: ProjectRow[] }) {
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "total", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        (statuses.length === 0 || statuses.includes(r.status)) &&
        (q === "" || `${r.name} ${r.owner}`.toLowerCase().includes(q)),
    );
  }, [allRows, search, statuses]);

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

  return (
    <Frame className="w-full" spacing="sm">
      <FramePanel className="p-0!">
        <DataGrid
          table={table}
          recordCount={rows.length}
          emptyMessage="No projects match these filters."
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
                <FolderKanbanIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <h2 className="text-foreground truncate text-sm font-medium">Per-project progress</h2>
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
                    placeholder="Search projects…"
                    aria-label="Search projects"
                  />
                </InputGroup>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    render={
                      <Button type="button" variant="outline">
                        <FilterIcon data-icon="inline-start" aria-hidden="true" />
                        Status
                        {statuses.length > 0 ? (
                          <Badge variant="outline" radius="full">
                            {statuses.length}
                          </Badge>
                        ) : null}
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Project status</DropdownMenuLabel>
                      {STATUSES.map((s) => (
                        <DropdownMenuCheckboxItem
                          key={s}
                          checked={statuses.includes(s)}
                          closeOnClick={false}
                          onCheckedChange={(checked) => {
                            setStatuses((cur) => (checked ? [...cur, s] : cur.filter((x) => x !== s)));
                            resetPage();
                          }}
                        >
                          {PROJECT_STATUS_LABELS[s]}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile: two-column summary list. */}
            <ul className="divide-border/60 divide-y sm:hidden">
              {table.getSortedRowModel().rows.map(({ original: r }) => (
                <li key={r.id}>
                  <a href={href(r.id)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                    <span className="text-foreground truncate text-sm font-medium">{r.name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {r.done}/{r.total} · {r.pct}%
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
                <DataGridPagination sizes={[10, 25, 50]} info="{from} - {to} of {count} projects" className="py-0" />
              </div>
            </div>
          </div>
        </DataGrid>
      </FramePanel>
    </Frame>
  );
}
