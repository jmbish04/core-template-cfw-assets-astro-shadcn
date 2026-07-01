/**
 * @fileoverview TaskDetailSections — the left-column building blocks of the task
 * viewport that aren't the description: the real-data "Completion" card (backed
 * by `task.progress`) and the honest empty-state cards for capabilities that
 * have no backing API in this slice (Subtasks, Comments, Attachments).
 *
 * Split out of {@link TaskDetail} purely to keep every island under the 400-line
 * cap. These are presentational; all mutations route back through the parent's
 * `onPatch`. We never fabricate rows — the project bans mock data, so the
 * unbacked sections advertise the capability behind a disabled affordance.
 */

"use client";

import { MinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import type { Task } from "./types";

const PROGRESS_PRESETS = [0, 25, 50, 75, 100];

/** Clamp an arbitrary number into the inclusive 0–100 progress range. */
function clampProgress(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export interface CompletionCardProps {
  task: Task;
  saving: boolean;
  onPatch: (body: Partial<Task>) => void;
}

/**
 * The "Completion" card — a thin progress bar over the real `task.progress`
 * plus a −/+10 stepper and quick presets. Each control PATCHes progress via the
 * parent's `onPatch`.
 */
export function CompletionCard({ task, saving, onPatch }: CompletionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Completion</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Progress value={task.progress} className="flex-1" />
          <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">
            {task.progress}%
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Decrease progress by 10"
            disabled={saving || task.progress <= 0}
            onClick={() => onPatch({ progress: clampProgress(task.progress - 10) })}
          >
            <MinusIcon className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Increase progress by 10"
            disabled={saving || task.progress >= 100}
            onClick={() => onPatch({ progress: clampProgress(task.progress + 10) })}
          >
            <PlusIcon className="size-4" />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6 bg-border/40" />
          {PROGRESS_PRESETS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={task.progress === p ? "secondary" : "ghost"}
              disabled={saving}
              onClick={() => onPatch({ progress: p })}
            >
              {p}%
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export interface SectionPlaceholderProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

/**
 * A clean, honest empty-state card for a viewport section that has no backing
 * API yet. We never fabricate rows — the project bans mock data — so these
 * sections advertise the capability and stay disabled until a real endpoint
 * exists.
 */
export function SectionPlaceholder({ icon, title, body }: SectionPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/20 px-4 py-8 text-center">
          <div className="text-muted-foreground [&>svg]:size-6">{icon}</div>
          <p className="max-w-xs text-xs text-muted-foreground">{body}</p>
          <Button size="sm" variant="outline" disabled>
            <PlusIcon className="size-4" />
            Coming soon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
