/**
 * @fileoverview facet-options — builders that turn the Tasks domain vocabulary
 * (statuses, priorities, assignees, labels) into {@link FacetOption} arrays for
 * the {@link FacetFilter}. Each builder attaches a `render` so the facet shows
 * the right inline visual:
 *
 *   - Status   → a colored status dot + label
 *   - Priority → the shared {@link PriorityBadge}
 *   - Label    → a subtle label chip
 *   - Assignee → an initials avatar + name
 *
 * Keeping these out of `TaskFilters.tsx` keeps every island under the 400-line
 * cap and lets the detail / board surfaces reuse the same option vocabulary.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { AssigneeAvatar } from "./Shared";
import { PriorityBadge } from "./PriorityBadge";
import type { FacetOption } from "./FacetFilter";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "./types";

/** Status → dot color, matching the StatusBadge color vocabulary. */
const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "bg-muted-foreground/60",
  in_progress: "bg-sky-400",
  in_review: "bg-violet-400",
  done: "bg-emerald-400",
};

/** A small colored dot used as the status facet's inline visual. */
function StatusDot({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status], className)}
    />
  );
}

/** Build the Status facet options (icon = colored dot + label). */
export function statusFacetOptions(): FacetOption[] {
  return (Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
    render: ({ context }) =>
      context === "trigger" ? (
        <span className="flex items-center gap-1">
          <StatusDot status={status} />
          {STATUS_LABELS[status]}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="truncate">{STATUS_LABELS[status]}</span>
        </span>
      ),
  }));
}

/** Build the Priority facet options (icon = PriorityBadge). */
export function priorityFacetOptions(): FacetOption[] {
  return (Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((priority) => ({
    value: priority,
    label: PRIORITY_LABELS[priority],
    render: () => <PriorityBadge priority={priority} className="h-4 px-1.5" />,
  }));
}

/** Build the Project facet options from id/name pairs. */
export function projectFacetOptions(
  options: { value: string; label: string }[],
): FacetOption[] {
  return options.map((o) => ({
    value: o.value,
    label: o.label,
    render: ({ context }) =>
      context === "trigger" ? (
        <span className="max-w-[8rem] truncate">{o.label}</span>
      ) : (
        <span className="truncate">{o.label}</span>
      ),
  }));
}

/** Build the Assignee facet options from distinct display names. */
export function assigneeFacetOptions(names: string[]): FacetOption[] {
  return names.map((name) => ({
    value: name,
    label: name,
    keywords: name,
    render: ({ context }) =>
      context === "trigger" ? (
        <span className="max-w-[7rem] truncate">{name}</span>
      ) : (
        <AssigneeAvatar name={name} showName size="sm" />
      ),
  }));
}

/** Build the Label facet options from distinct label strings. */
export function labelFacetOptions(labels: string[]): FacetOption[] {
  return labels.map((label) => ({
    value: label,
    label,
    keywords: label,
    render: ({ context }) =>
      context === "trigger" ? (
        <span className="max-w-[7rem] truncate">{label}</span>
      ) : (
        <Badge variant="secondary" className="font-normal">
          {label}
        </Badge>
      ),
  }));
}
