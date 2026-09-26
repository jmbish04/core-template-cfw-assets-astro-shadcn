/**
 * @fileoverview TaskBoard — the `/tasks/board` island, adapted from the ReUI Pro
 * block `kanban-board-8` (Frame columns with dot + count headers, Item cards
 * with meta rows and a progress footer, horizontal Base UI scroll area) on the
 * ReUI Kanban component.
 *
 * Data: `GET /api/tasks/board` → four status columns. A drag is committed once
 * via Kanban `onValueCommit`: the moved card is PATCHed with its new `status`
 * and `position` (`PATCH /api/tasks/{id}`); on failure the board rolls back to
 * the pre-drag snapshot. Clicking a card opens {@link TaskPreviewDialog}; each
 * column's "+" opens {@link TaskDialog} pre-set to that status.
 */

"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UniqueIdentifier } from "@dnd-kit/core";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { CalendarClockIcon, PlusIcon } from "lucide-react";

import {
  Frame,
  FrameHeader,
  FrameTitle,
} from "@/components/reui/frame";
import {
  Kanban,
  KanbanBoard as KanbanBoardPrimitive,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanCommitMeta,
} from "@/components/reui/kanban";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { AssigneeAvatar, ErrorState, LabelChips } from "./Shared";
import { PriorityBadge } from "./PriorityBadge";
import { TASK_STATUS_DOT } from "./StatusBadge";
import { TaskDialog } from "./TaskDialog";
import { TaskPreviewDialog } from "./TaskPreviewDialog";
import { htmlToPlainText } from "./task-html";
import { useProjects } from "./useProjects";
import {
  BOARD_STATUSES,
  STATUS_LABELS,
  type BoardResponse,
  type Task,
  type TaskStatus,
} from "./types";

type Columns = Record<TaskStatus, Task[]>;

const EMPTY_COLUMNS: Columns = { todo: [], in_progress: [], in_review: [], done: [] };

/** Horizontal scroll wrapper from kanban-board-8 (Base UI ScrollArea). */
function BoardScrollArea({ children }: { children: ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className="relative w-full min-w-0 pb-3">
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="w-full snap-x snap-mandatory rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:snap-none"
      >
        <ScrollAreaPrimitive.Content data-slot="scroll-area-content" className="w-max min-w-full">
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        orientation="horizontal"
        className="flex touch-none p-px select-none data-horizontal:h-2.5 data-horizontal:flex-col"
      >
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-foreground/15" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  );
}

/** A task card (kanban-board-8 ReleaseCard adapted to Task). */
function TaskKanbanCard({
  task,
  onOpen,
  isOverlay,
}: {
  task: Task;
  onOpen?: (task: Task) => void;
  isOverlay?: boolean;
}) {
  const summary = task.description ? htmlToPlainText(task.description).trim() : "";
  const card = (
    <Item
      variant="outline"
      size="sm"
      className={cn(
        "items-stretch gap-3 bg-card transition-colors hover:bg-muted/20",
        isOverlay && "shadow-lg",
      )}
      onClick={() => onOpen?.(task)}
    >
      <ItemHeader className="min-w-0 items-start gap-2.5">
        <ItemContent className="min-w-0 gap-1">
          <ItemTitle className="line-clamp-2 leading-5 font-medium" title={task.title}>
            {/* A real button so keyboard users can open the preview; Enter/Space
                are stopped here so they don't also start a keyboard drag. */}
            <button
              type="button"
              className="text-left outline-none focus-visible:underline"
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.(task);
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {task.title}
            </button>
          </ItemTitle>
          {summary ? (
            <ItemDescription className="line-clamp-2 text-xs">{summary}</ItemDescription>
          ) : null}
        </ItemContent>
        <ItemActions className="shrink-0">
          <PriorityBadge priority={task.priority} />
        </ItemActions>
      </ItemHeader>

      {task.labels.length > 0 ? <LabelChips labels={task.labels} max={3} /> : null}

      <ItemContent className="min-w-0 flex-row items-center justify-between gap-2 text-sm">
        {task.assignee ? (
          <AssigneeAvatar name={task.assignee} showName className="min-w-0" />
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
          <CalendarClockIcon className="size-3.5" aria-hidden />
          {task.dueDate != null ? shortDate(task.dueDate) : "—"}
        </span>
      </ItemContent>

      <ItemFooter className="min-w-0 flex-col items-stretch gap-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="tabular-nums">{task.progress}%</span>
        </div>
        <Progress
          value={task.progress}
          className={cn(
            "gap-0 **:data-[slot=progress-track]:h-1.5 **:data-[slot=progress-track]:rounded-full **:data-[slot=progress-track]:bg-muted **:data-[slot=progress-indicator]:rounded-full",
            task.status === "done" && "**:data-[slot=progress-indicator]:bg-success",
          )}
        >
          <ProgressLabel className="sr-only">{task.title} progress</ProgressLabel>
        </Progress>
      </ItemFooter>
    </Item>
  );

  if (isOverlay) return <KanbanItem value={task.id}>{card}</KanbanItem>;
  return (
    <KanbanItem value={task.id}>
      <KanbanItemHandle className="block cursor-grab active:cursor-grabbing">{card}</KanbanItemHandle>
    </KanbanItem>
  );
}

/** One status column (kanban-board-8 ReleaseColumnView adapted). */
function StatusColumn({
  status,
  tasks,
  onOpen,
  onCreated,
}: {
  status: TaskStatus;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onCreated: (task: Task) => void;
}) {
  const addLabel = `Add task to ${STATUS_LABELS[status]}`;
  return (
    <KanbanColumn
      value={status}
      className="w-[calc(100vw-3rem)] max-w-[19rem] shrink-0 snap-start sm:w-[19rem]"
    >
      <Frame spacing="sm" aria-label={STATUS_LABELS[status]}>
        <FrameHeader className="flex min-h-10 flex-row items-center gap-2 px-2 py-1.5">
          <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", TASK_STATUS_DOT[status])} />
          <FrameTitle className="truncate text-sm leading-5">{STATUS_LABELS[status]}</FrameTitle>
          <span className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
            {tasks.length}
          </span>
          <TaskDialog
            onSaved={onCreated}
            defaultStatus={status}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="ml-auto text-muted-foreground hover:text-foreground"
                aria-label={addLabel}
                title={addLabel}
              >
                <PlusIcon aria-hidden />
              </Button>
            }
          />
        </FrameHeader>

        <KanbanColumnContent value={status} className="min-h-20 gap-2 p-0.5">
          {tasks.map((task) => (
            <TaskKanbanCard key={task.id} task={task} onOpen={onOpen} />
          ))}
          {tasks.length === 0 ? (
            <p className="flex h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Drop tasks here
            </p>
          ) : null}
        </KanbanColumnContent>
      </Frame>
    </KanbanColumn>
  );
}

function findTask(columns: Columns, id: UniqueIdentifier): Task | null {
  for (const tasks of Object.values(columns)) {
    const hit = tasks.find((t) => t.id === String(id));
    if (hit) return hit;
  }
  return null;
}

function columnOf(columns: Columns, id: string): TaskStatus | null {
  for (const status of BOARD_STATUSES) {
    if (columns[status].some((t) => t.id === id)) return status;
  }
  return null;
}

export function TaskBoard() {
  const [columns, setColumns] = useState<Columns>(EMPTY_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { nameById } = useProjects();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<BoardResponse>("tasks/board");
      const next: Columns = { ...EMPTY_COLUMNS };
      for (const col of res.columns) next[col.status] = col.tasks;
      setColumns(next);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? `Couldn't load the board: ${e.message}. Try again.`
          : "Couldn't load the board. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalTasks = useMemo(
    () => BOARD_STATUSES.reduce((sum, s) => sum + columns[s].length, 0),
    [columns],
  );

  /** Persist a finished drag: new status + position for the moved card. */
  const handleCommit = useCallback(
    async (value: Record<string, Task[]>, meta: KanbanCommitMeta<Task>) => {
      if (meta.kind !== "item") return;
      const id = String(meta.event.active.id);
      const before = meta.previousValue as Columns;
      const after = value as Columns;
      const from = columnOf(before, id);
      const to = columnOf(after, id);
      if (!to) return;
      const position = after[to].findIndex((t) => t.id === id);
      if (from === to && before[to].findIndex((t) => t.id === id) === position) return;

      const task = after[to][position]!;
      const patch: Partial<Task> =
        to === "done" && task.progress < 100
          ? { status: to, position, progress: 100 }
          : { status: to, position };
      // Keep the card's own status in sync with the column it now sits in.
      setColumns((cols) => ({
        ...cols,
        [to]: cols[to].map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      try {
        // ponytail: only the moved card's position is written; neighbours keep
        // theirs, so order within a column is approximate until a full reindex
        // endpoint exists.
        await apiSend<Task>("PATCH", `tasks/${id}`, patch);
      } catch (e) {
        setColumns(before);
        setError(
          `Couldn't move “${task.title}”${e instanceof ApiError ? `: ${e.message}` : ""}. It's back where it was — try again.`,
        );
      }
    },
    [],
  );

  const handleCreated = useCallback((task: Task) => {
    setColumns((cols) => ({ ...cols, [task.status]: [task, ...cols[task.status]] }));
  }, []);

  const openPreview = useCallback((task: Task) => {
    setPreviewTask(task);
    setPreviewOpen(true);
  }, []);

  // Reconcile an edited task back into the board, moving columns if needed.
  const handleUpdated = useCallback((updated: Task) => {
    setPreviewTask(updated);
    setColumns((cols) => {
      const next = { ...cols };
      for (const s of BOARD_STATUSES) next[s] = cols[s].filter((t) => t.id !== updated.id);
      next[updated.status] = [updated, ...next[updated.status]];
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {totalTasks} {totalTasks === 1 ? "task" : "tasks"} across {BOARD_STATUSES.length} columns
      </p>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {BOARD_STATUSES.map((s) => (
            <Skeleton key={s} className="h-72 w-[19rem] shrink-0 rounded-lg" />
          ))}
        </div>
      ) : (
        <Kanban
          value={columns}
          onValueChange={(v) => setColumns(v as Columns)}
          onValueCommit={handleCommit}
          getItemValue={(t: Task) => t.id}
          restoreOnCancel
          className="w-full"
        >
          <BoardScrollArea>
            <KanbanBoardPrimitive className="grid min-w-max auto-cols-[19rem] grid-flow-col grid-cols-none items-start gap-3 p-1 max-sm:auto-cols-[calc(100vw-3rem)]">
              {BOARD_STATUSES.map((status) => (
                <StatusColumn
                  key={status}
                  status={status}
                  tasks={columns[status]}
                  onOpen={openPreview}
                  onCreated={handleCreated}
                />
              ))}
            </KanbanBoardPrimitive>
          </BoardScrollArea>

          <KanbanOverlay>
            {({ value, variant }) => {
              if (variant === "column") return null;
              const task = findTask(columns, value);
              return task ? <TaskKanbanCard task={task} isOverlay /> : null;
            }}
          </KanbanOverlay>
        </Kanban>
      )}

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
