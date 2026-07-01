/**
 * @fileoverview TaskDetailSidebar — the right-hand "Properties" column of the
 * task viewport (`/tasks/[id]`). Retrofits the framework's Properties card as a
 * `grid-cols-[76px_1fr]` label/value list with separators between groups:
 *
 *   Status      → editable via a {@link Select} (PATCH status)
 *   Priority    → editable via a {@link Select} (PATCH priority)
 *   Assignees   → the task's single `assignee` rendered as an avatar + name row
 *                 (the multi-row layout shape is preserved for future multi-assignee)
 *   Project     → editable via a {@link Select} of `/api/projects` (PATCH projectId)
 *   Started     → `task.createdAt` (calendar icon + formatted date, read-only)
 *   Due date    → editable inline `<input type=date>` (PATCH dueDate)
 *   Labels      → wrapped outline badges, editable via a comma-separated input
 *
 * Every edit routes through the parent's `onPatch` so optimistic state + error
 * handling stay in one place ({@link TaskDetail}). Pure Base-UI + Monolith dark
 * theme; separators use `bg-border/40`, never 1px borders.
 */

"use client";

import { useState } from "react";
import { CalendarIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shortDate } from "@/lib/format";

import { AssigneeAvatar } from "./Shared";
import { useProjects } from "./useProjects";
import {
  BOARD_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const NO_PROJECT = "__none__";

export interface TaskDetailSidebarProps {
  task: Task;
  saving: boolean;
  onPatch: (body: Partial<Task>) => void;
}

/** A single `grid-cols-[76px_1fr]` property row: a muted label + a value slot. */
function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[76px_1fr] items-start gap-2">
      <span className="pt-1 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

/** Convert an ISO/epoch due date into a yyyy-mm-dd value for `<input type=date>`. */
function toDateInput(value: Task["dueDate"]): string {
  if (value == null) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function TaskDetailSidebar({ task, saving, onPatch }: TaskDetailSidebarProps) {
  const { options: projectOptions } = useProjects();

  const [editingDue, setEditingDue] = useState(false);
  const [dueDraft, setDueDraft] = useState("");
  const [editingLabels, setEditingLabels] = useState(false);
  const [labelsDraft, setLabelsDraft] = useState("");

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Properties
        </h2>

        <PropertyRow label="Status">
          <Select
            value={task.status}
            onValueChange={(v) => onPatch({ status: v as TaskStatus })}
          >
            <SelectTrigger size="sm" className="w-full" disabled={saving}>
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
        </PropertyRow>

        <PropertyRow label="Priority">
          <Select
            value={task.priority}
            onValueChange={(v) => onPatch({ priority: v as TaskPriority })}
          >
            <SelectTrigger size="sm" className="w-full" disabled={saving}>
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
        </PropertyRow>

        <Separator className="bg-border/40" />

        <PropertyRow label="Assignees">
          {/* Single assignee today; layout shape kept for future multi-assignee. */}
          <div className="flex flex-col gap-1.5">
            {task.assignee ? (
              <AssigneeAvatar name={task.assignee} showName />
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </div>
        </PropertyRow>

        <PropertyRow label="Project">
          <Select
            value={task.projectId ?? NO_PROJECT}
            onValueChange={(v) => onPatch({ projectId: v === NO_PROJECT ? null : String(v) })}
          >
            <SelectTrigger size="sm" className="w-full" disabled={saving}>
              <SelectValue placeholder="No project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT}>No project</SelectItem>
              {projectOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>

        <Separator className="bg-border/40" />

        <PropertyRow label="Started">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarIcon className="size-3.5" />
            {shortDate(task.createdAt)}
          </span>
        </PropertyRow>

        <PropertyRow label="Due date">
          {editingDue ? (
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={dueDraft}
                onChange={(e) => setDueDraft(e.target.value)}
                className="h-8"
                autoFocus
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Save due date"
                disabled={saving}
                onClick={() => {
                  onPatch({ dueDate: dueDraft ? new Date(dueDraft).getTime() : null });
                  setEditingDue(false);
                }}
              >
                <CheckIcon className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Cancel"
                onClick={() => setEditingDue(false)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-muted-foreground transition-colors hover:bg-muted"
              onClick={() => {
                setDueDraft(toDateInput(task.dueDate));
                setEditingDue(true);
              }}
            >
              <CalendarIcon className="size-3.5" />
              {task.dueDate != null ? shortDate(task.dueDate) : "Set due date"}
              <PencilIcon className="ml-auto size-3 opacity-60" />
            </button>
          )}
        </PropertyRow>

        <Separator className="bg-border/40" />

        <PropertyRow label="Labels">
          {editingLabels ? (
            <div className="flex flex-col gap-2">
              <Input
                value={labelsDraft}
                onChange={(e) => setLabelsDraft(e.target.value)}
                placeholder="Comma-separated"
                className="h-8"
                autoFocus
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    const next = labelsDraft
                      .split(",")
                      .map((l) => l.trim())
                      .filter(Boolean);
                    onPatch({ labels: next });
                    setEditingLabels(false);
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingLabels(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-1 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted"
              onClick={() => {
                setLabelsDraft(task.labels.join(", "));
                setEditingLabels(true);
              }}
            >
              {task.labels.length > 0 ? (
                task.labels.map((l) => (
                  <Badge key={l} variant="outline" className="font-normal">
                    {l}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">Add labels</span>
              )}
              <PencilIcon className="ml-auto size-3 opacity-60" />
            </button>
          )}
        </PropertyRow>
      </CardContent>
    </Card>
  );
}
