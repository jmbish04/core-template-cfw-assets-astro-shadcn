import { useState, type ComponentProps, type ReactNode } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Kanban,
  KanbanBoard as KanbanBoardPrimitive,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/reui/kanban"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { cn } from "@/lib/utils"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  BOARD_COLUMNS,
  BOARD_DESCRIPTION,
  BOARD_TITLE,
  INITIAL_BUG_COLUMNS,
  type BugTask,
} from "./data"
import { CalendarDaysIcon, ArrowRightIcon, FilterIcon, Share2Icon, PlusIcon, GripVerticalIcon } from "lucide-react"

function BoardScrollArea({ children }: { children: ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className="relative w-full min-w-0 pb-3"
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 w-full rounded-lg transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        <ScrollAreaPrimitive.Content
          data-slot="scroll-area-content"
          className="w-max min-w-full"
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        data-slot="scroll-area-scrollbar"
        data-orientation="horizontal"
        orientation="horizontal"
        className="flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent"
      >
        <ScrollAreaPrimitive.Thumb
          data-slot="scroll-area-thumb"
          className="bg-foreground/15 relative flex-1 rounded-full"
        />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

const signalDotClass: Record<BugTask["signal"], string> = {
  Blocked: "bg-destructive",
  "At risk": "bg-warning",
  "On track": "bg-success",
  Queued: "bg-zinc-400 dark:bg-zinc-500",
}

function completionRingColor(rate: number) {
  if (rate >= 75) return "text-emerald-500"
  if (rate >= 40) return "text-amber-500"
  return "text-rose-500"
}

function SignalBadge({ task }: { task: BugTask }) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          signalDotClass[task.signal]
        )}
        aria-hidden="true"
      />
      {task.signal}
    </Badge>
  )
}

function DueBadge({ dueLabel }: { dueLabel: string }) {
  return (
    <Badge variant="outline" className="bg-background gap-1.5 font-normal">
      <CalendarDaysIcon className="text-muted-foreground size-3.5" aria-hidden="true" />
      <span className="tabular-nums">{dueLabel}</span>
    </Badge>
  )
}

function CompletionRing({ rate }: { rate: number | null }) {
  if (rate === null) {
    return (
      <span
        className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums"
        aria-label="Completion not available"
      >
        <span className="border-border flex size-5 shrink-0 items-center justify-center rounded-full border">
          -
        </span>
      </span>
    )
  }

  const radius = 9
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (rate / 100) * circumference

  return (
    <span
      className="flex items-center gap-1.5"
      aria-label={`${rate}% complete`}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn("size-5 shrink-0", completionRingColor(rate))}
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          className="stroke-border"
          strokeWidth="2.5"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          className="stroke-current"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 12 12)"
        />
      </svg>
      <span className="text-foreground text-xs tabular-nums">{rate}%</span>
    </span>
  )
}

function TaskTitleAffordance({
  title,
  isDone,
}: {
  title: string
  isDone?: boolean
}) {
  return (
    <span className="group/task-title inline-flex max-w-full min-w-0 items-start gap-1">
      <span
        data-slot="kanban-task-title"
        className={cn(
          "hover:text-primary line-clamp-2 cursor-pointer py-0.25 transition-colors",
          isDone && "text-muted-foreground line-through"
        )}
      >
        {title}
      </span>
      <ArrowRightIcon className="mt-1 size-3 shrink-0 -translate-x-1 opacity-0 transition-all group-hover/task-title:translate-x-0 group-hover/task-title:opacity-100" aria-hidden="true" />
    </span>
  )
}

function BoardTopBar() {
  return (
    <header className="px-1">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight">
            {BOARD_TITLE}
          </h2>
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
            {BOARD_DESCRIPTION}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button type="button" variant="outline" size="sm">
            <FilterIcon data-icon="inline-start" aria-hidden="true" />
            Filters
          </Button>

          <Button type="button" variant="outline" size="sm">
            <Share2Icon data-icon="inline-start" aria-hidden="true" />
            Share
          </Button>

          <Button type="button" size="sm">
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            New task
          </Button>
        </div>
      </div>
    </header>
  )
}

interface TaskCardProps extends Omit<
  ComponentProps<typeof KanbanItem>,
  "value" | "children"
> {
  task: BugTask
  asHandle?: boolean
  isOverlay?: boolean
  isDone?: boolean
}

function TaskCard({
  task,
  asHandle,
  isOverlay,
  isDone,
  ...props
}: TaskCardProps) {
  const card = (
    <Card
      size="sm"
      className={cn(
        "bg-card hover:border-foreground/20 p-0 shadow-xs transition-[border-color,box-shadow] hover:shadow-sm",
        isOverlay && "shadow-lg",
        isDone && "bg-muted/40"
      )}
    >
      <CardContent className="flex min-h-[8.75rem] flex-col p-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge variant={task.labelVariant}>{task.label}</Badge>
            <span className="text-muted-foreground truncate text-xs tabular-nums">
              {task.taskKey}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {task.priority}
            </span>
          </div>
          <SignalBadge task={task} />
        </div>

        <h3 className="mt-3 min-h-10 text-sm leading-5 font-medium">
          <TaskTitleAffordance title={task.title} isDone={isDone} />
        </h3>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src={task.ownerAvatar} alt={task.owner} />
              <AvatarFallback>{task.ownerInitials}</AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground truncate text-xs font-medium">
              {task.owner}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <DueBadge dueLabel={task.dueLabel} />
            <CompletionRing rate={task.completionRate} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <KanbanItem value={task.id} {...props}>
      {asHandle && !isOverlay ? (
        <KanbanItemHandle className="block">{card}</KanbanItemHandle>
      ) : (
        card
      )}
    </KanbanItem>
  )
}

interface StatusColumnProps extends Omit<
  ComponentProps<typeof KanbanColumn>,
  "children"
> {
  tasks: BugTask[]
  isOverlay?: boolean
}

function StatusColumn({
  value,
  tasks,
  isOverlay,
  ...props
}: StatusColumnProps) {
  const column = BOARD_COLUMNS[String(value)] ?? BOARD_COLUMNS.open
  const isDone = String(value) === "cannotReproduce"

  return (
    <KanbanColumn
      value={String(value)}
      className="w-[17.5rem] min-w-[17.5rem]"
      {...props}
    >
      <section
        className={cn(
          "flex min-h-[16rem] flex-col gap-2 rounded-lg border p-2.5 transition-colors",
          column.surfaceClassName,
          column.borderClassName,
          isOverlay && "shadow-lg"
        )}
        aria-label={`${column.title} bugs`}
      >
        <div className="flex h-8 items-center gap-2 px-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{column.title}</h3>
            <Badge variant="outline" className="bg-background">
              {tasks.length}
            </Badge>
          </div>
          <KanbanColumnHandle
            className="opacity-100!"
            render={({ className, ...handleProps }) => (
              <Button
                {...handleProps}
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Move ${column.title} column`}
                className={cn(
                  "text-muted-foreground hover:text-foreground ml-auto cursor-grab active:cursor-grabbing",
                  className
                )}
              >
                <GripVerticalIcon aria-hidden="true" />
              </Button>
            )}
          />
        </div>

        <KanbanColumnContent value={String(value)} className="min-h-28 gap-2">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                asHandle={!isOverlay}
                isOverlay={isOverlay}
                isDone={isDone}
              />
            ))
          ) : (
            <div
              className={cn(
                "border-border/70 text-muted-foreground bg-background/55 rounded-lg border border-dashed px-3 py-6 text-center text-xs transition-colors",
                column.addClassName
              )}
            >
              No cards
            </div>
          )}
        </KanbanColumnContent>
      </section>
    </KanbanColumn>
  )
}

export function KanbanBoard() {
  const [columns, setColumns] = useState(INITIAL_BUG_COLUMNS)

  return (
    <section className="mx-auto flex w-full max-w-[1180px] flex-col gap-7">
      <BoardTopBar />

      <div className="min-w-0">
        <Kanban
          value={columns}
          onValueChange={setColumns}
          getItemValue={(item) => item.id}
          className="w-full"
        >
          <BoardScrollArea>
            <KanbanBoardPrimitive className="grid min-w-max auto-cols-[17.5rem] grid-flow-col grid-cols-none gap-3 px-1 pb-2">
              {Object.entries(columns).map(([columnId, tasks]) => (
                <StatusColumn key={columnId} value={columnId} tasks={tasks} />
              ))}
            </KanbanBoardPrimitive>
          </BoardScrollArea>

          <KanbanOverlay>
            {({ value, variant }) => {
              if (variant === "column") {
                const columnTasks = columns[String(value)] ?? []

                return (
                  <StatusColumn
                    value={String(value)}
                    tasks={columnTasks}
                    isOverlay
                  />
                )
              }

              const taskColumn = Object.entries(columns).find(([, tasks]) =>
                tasks.some((item) => item.id === value)
              )
              const task = taskColumn?.[1].find((item) => item.id === value)

              if (!task) {
                return null
              }

              return (
                <TaskCard
                  task={task}
                  isOverlay
                  isDone={taskColumn?.[0] === "cannotReproduce"}
                />
              )
            }}
          </KanbanOverlay>
        </Kanban>
      </div>
    </section>
  )
}