/**
 * @fileoverview TaskFilters — the Linear-style faceted filter bar shared by the
 * TaskList table. A controlled component: it owns no state; the parent passes
 * the current `value` and an `onChange` patch handler.
 *
 * Each facet (Status, Priority, Project, Assignee, Label) is a multi-select
 * {@link FacetFilter}: a dashed outline button that opens a popover with a
 * (searchable) checkbox list, surfacing the active selection as inline chips.
 * Assignee and Label options are derived from the real task data via
 * {@link useTaskFacets} rather than free-text inputs. A free-text search box
 * and a single-select sort round out the bar, plus an "N filters active"
 * indicator and a Clear-all button.
 */

import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FacetFilter } from "./FacetFilter";
import { FilterSelect } from "./FilterSelect";
import {
  assigneeFacetOptions,
  labelFacetOptions,
  priorityFacetOptions,
  projectFacetOptions,
  statusFacetOptions,
} from "./facet-options";
import { useProjects } from "./useProjects";
import { useTaskFacets } from "./useTaskFacets";
import type { TaskPriority, TaskStatus } from "./types";

/**
 * The shape of the task-list query the parent tracks. Every faceted dimension
 * is a (possibly empty) array of selected values; `q` is the free-text search
 * and `sort` is the single-select sort field.
 */
export interface TaskQuery {
  q: string;
  status: TaskStatus[];
  priority: TaskPriority[];
  projectId: string[];
  assignee: string[];
  label: string[];
  sort: string;
}

/** A fresh, fully-empty query. Optionally seeds a single project filter. */
export function emptyTaskQuery(projectId?: string): TaskQuery {
  return {
    q: "",
    status: [],
    priority: [],
    projectId: projectId ? [projectId] : [],
    assignee: [],
    label: [],
    sort: "createdAt",
  };
}

/** Count how many facet dimensions (excluding sort) are currently active. */
export function activeFilterCount(value: TaskQuery): number {
  return (
    (value.q.trim() ? 1 : 0) +
    value.status.length +
    value.priority.length +
    value.projectId.length +
    value.assignee.length +
    value.label.length
  );
}

const SORT_OPTIONS = [
  { value: "createdAt", label: "Recently created" },
  { value: "dueDate", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "position", label: "Manual order" },
];

const STATUS_FACET = statusFacetOptions();
const PRIORITY_FACET = priorityFacetOptions();

export interface TaskFiltersProps {
  value: TaskQuery;
  onChange: (patch: Partial<TaskQuery>) => void;
  onClear: () => void;
}

export function TaskFilters({ value, onChange, onClear }: TaskFiltersProps) {
  const { options: projectOptions } = useProjects();
  const { assignees, labels, error } = useTaskFacets();
  if (error) {
    console.error("Failed to load task facets:", error);
  }

  const projectFacet = projectFacetOptions(projectOptions);
  const assigneeFacet = assigneeFacetOptions(assignees);
  const labelFacet = labelFacetOptions(labels);

  const activeCount = activeFilterCount(value);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative min-w-[12rem] flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Search tasks…"
          className="pl-8"
          aria-label="Search tasks"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FacetFilter
          label="Status"
          options={STATUS_FACET}
          value={value.status}
          onChange={(next) => onChange({ status: next as TaskStatus[] })}
        />
        <FacetFilter
          label="Priority"
          options={PRIORITY_FACET}
          value={value.priority}
          onChange={(next) => onChange({ priority: next as TaskPriority[] })}
        />
        <FacetFilter
          label="Project"
          options={projectFacet}
          value={value.projectId}
          onChange={(next) => onChange({ projectId: next })}
        />
        <FacetFilter
          label="Assignee"
          options={assigneeFacet}
          value={value.assignee}
          onChange={(next) => onChange({ assignee: next })}
        />
        <FacetFilter
          label="Label"
          options={labelFacet}
          value={value.label}
          onChange={(next) => onChange({ label: next })}
        />

        <FilterSelect
          value={value.sort}
          onChange={(v) => onChange({ sort: v ?? "createdAt" })}
          options={SORT_OPTIONS}
          allLabel="Recently created"
          aria-label="Sort tasks"
        />

        {activeCount > 0 ? (
          <>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <SlidersHorizontalIcon className="size-3.5" />
              {activeCount} {activeCount === 1 ? "filter" : "filters"} active
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-muted-foreground"
            >
              <XIcon className="size-4" />
              Clear all
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
