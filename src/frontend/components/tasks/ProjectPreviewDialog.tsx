/**
 * @fileoverview ProjectPreviewDialog — a quick-look modal opened by clicking a
 * project card. Since there is no dedicated `/projects/{id}` route, this preview
 * surfaces the project's own tasks: it fetches `GET /api/tasks?projectId={id}`
 * and lists them (status dot + title + priority), with each row deep-linking to
 * `/tasks/{id}`. A "View all tasks" action deep-links to the filtered task list
 * (`/tasks?projectId={id}`), and an inline Edit reuses {@link ProjectDialog}.
 *
 * Fully controlled (`open` / `onOpenChange`). Base-UI Dialog, Monolith dark
 * theme, ring separation, inline LOADING / EMPTY / ERROR states (no alert()).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRightIcon, PencilIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, ApiError } from "@/lib/api";

import { Frame, FramePanel } from "@/components/reui/frame";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { compactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ErrorState, MOBILE_SHEET_DIALOG } from "./Shared";
import { PriorityBadge } from "./PriorityBadge";
import { ProjectDialog } from "./ProjectDialog";
import { ProjectStatusBadge, TASK_STATUS_DOT as STATUS_DOT } from "./StatusBadge";
import type { ListEnvelope, Project, Task } from "./types";


export interface ProjectPreviewDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the updated project after an inline edit save. */
  onSaved: (project: Project) => void;
}

export function ProjectPreviewDialog({
  project,
  open,
  onOpenChange,
  onSaved,
}: ProjectPreviewDialogProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectId = project?.id;

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<ListEnvelope<Task>>("tasks", {
        projectId,
        sort: "priority",
        limit: 50,
      });
      setTasks(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load project tasks.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open && projectId) void load();
  }, [open, projectId, load]);

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const donePct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-lg", MOBILE_SHEET_DIALOG)}>
        {project ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full ring-1 ring-foreground/10"
                  style={{ backgroundColor: project.color }}
                />
                <DialogTitle className="text-lg leading-snug">{project.name}</DialogTitle>
                <ProjectStatusBadge status={project.status} />
              </div>
              <DialogDescription>
                {project.description ?? "No description."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              {/* Progress stats: dense label|value rows + a done-share bar. */}
              <Frame spacing="sm">
                <FramePanel className="flex flex-col gap-3">
                  <dl className="grid grid-cols-3 gap-3 text-sm max-sm:grid-cols-1 max-sm:gap-1.5">
                    {[
                      { label: "Owner", value: project.owner },
                      { label: "Tasks", value: compactNumber(project.taskCount) },
                      { label: "Done", value: loading ? "—" : `${doneCount} of ${tasks.length}` },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="flex min-w-0 flex-col gap-0.5 max-sm:flex-row max-sm:justify-between"
                      >
                        <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                        <dd className="truncate font-medium tabular-nums">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <Progress
                    value={donePct}
                    className="gap-0 **:data-[slot=progress-track]:h-1.5 **:data-[slot=progress-track]:rounded-full **:data-[slot=progress-indicator]:rounded-full **:data-[slot=progress-indicator]:bg-success"
                  >
                    <ProgressLabel className="sr-only">Share of project tasks done</ProgressLabel>
                  </Progress>
                </FramePanel>
              </Frame>

              <Separator className="bg-border/40" />

              {error ? <ErrorState message={error} onRetry={load} /> : null}

              {loading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <p className="rounded-md bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border/40">
                  No tasks in this project yet.
                </p>
              ) : (
                <ScrollArea className="max-h-64">
                  <ul className="flex flex-col divide-y divide-border/40">
                    {tasks.map((task) => (
                      <li key={task.id}>
                        <a
                          href={`/tasks/${task.id}`}
                          className="flex items-center gap-2.5 px-1 py-2 text-sm transition-colors hover:bg-muted/40"
                        >
                          <span
                            aria-hidden
                            className={`size-2 shrink-0 rounded-full ${STATUS_DOT[task.status]}`}
                          />
                          <span className="min-w-0 flex-1 truncate">{task.title}</span>
                          <PriorityBadge priority={task.priority} className="h-4 px-1.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}

              <Separator className="bg-border/40" />

              <div className="flex flex-wrap items-center justify-end gap-2">
                <ProjectDialog
                  project={project}
                  onSaved={onSaved}
                  trigger={
                    <Button variant="outline" size="sm">
                      <PencilIcon className="size-4" />
                      Edit
                    </Button>
                  }
                />
                <Button
                  size="sm"
                  render={
                    <a
                      href={`/tasks?projectId=${encodeURIComponent(project.id)}`}
                      aria-label="View all tasks in this project"
                    />
                  }
                >
                  <ArrowUpRightIcon className="size-4" />
                  View all tasks
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
