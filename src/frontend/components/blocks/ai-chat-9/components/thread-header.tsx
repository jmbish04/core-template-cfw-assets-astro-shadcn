"use client"

import { useState } from "react"
import { Badge } from "@/components/reui/badge"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type ThreadRecord } from "./data"
import { ChevronDownIcon, PlusIcon, StarIcon, EllipsisVerticalIcon, LinkIcon, CopyIcon, Minimize2Icon, Maximize2Icon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_CHEVRON = (
  <ChevronDownIcon className="opacity-60" data-icon="inline-end" aria-hidden="true" />
)

const ICON_NEW = (
  <PlusIcon aria-hidden="true" />
)

const ICON_STAR = (
  <StarIcon aria-hidden="true" />
)

/** The pressed twin: same glyph, painted in. Sets that ship a solid path
    ignore the fill, and the primary colour carries the state there. */
const ICON_STAR_ON = (
  <StarIcon className="fill-current" aria-hidden="true" />
)

const ICON_MORE = (
  <EllipsisVerticalIcon aria-hidden="true" />
)

const ICON_LINK = (
  <LinkIcon aria-hidden="true" />
)

const ICON_TRANSCRIPT = (
  <CopyIcon aria-hidden="true" />
)

const ICON_COLLAPSE = (
  <Minimize2Icon aria-hidden="true" />
)

const ICON_EXPAND = (
  <Maximize2Icon aria-hidden="true" />
)

/** Tabs the switcher offers. Earlier means anything not filed under today, so
    yesterday lands there rather than earning a fifth tab the strip cannot fit. */
const THREAD_TABS = [
  { id: "all", label: "All" },
  { id: "pinned", label: "Pinned" },
  { id: "today", label: "Today" },
  { id: "earlier", label: "Earlier" },
]

/** Groups the All tab heads with a label. Favourites lift out of their recency
    there; a recency tab still shows them, since Today means everything today. */
function groupsFor(
  threads: ThreadRecord[],
  favorites: Record<string, boolean>
) {
  return [
    { label: "Pinned", threads: threads.filter((t) => favorites[t.id]) },
    ...(
      [
        ["Today", "today"],
        ["Yesterday", "yesterday"],
        ["Earlier", "earlier"],
      ] as const
    ).map(([label, recency]) => ({
      label,
      threads: threads.filter((t) => !favorites[t.id] && t.recency === recency),
    })),
  ].filter((group) => group.threads.length > 0)
}

function threadsForTab(
  tabId: string,
  threads: ThreadRecord[],
  favorites: Record<string, boolean>
) {
  if (tabId === "pinned") return threads.filter((t) => favorites[t.id])
  if (tabId === "today") return threads.filter((t) => t.recency === "today")
  return threads.filter((t) => t.recency !== "today")
}

function SwitcherRow({
  thread,
  isActive,
  live,
  activityLabel,
  onSelect,
}: {
  thread: ThreadRecord
  isActive: boolean
  /** True while this thread's reply is still being written. */
  live: boolean
  activityLabel: string
  onSelect: (id: string) => void
}) {
  return (
    // Height follows content: a row with no artifact stays a single tight line.
    <Button
      variant={isActive ? "secondary" : "ghost"}
      aria-current={isActive ? "true" : undefined}
      onClick={() => onSelect(thread.id)}
      className="h-auto w-full flex-col items-stretch justify-center gap-0.5 px-2 py-1.5 text-sm font-normal"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-start">
          {thread.title}
        </span>
        <span className="text-muted-foreground w-16 shrink-0 text-end text-xs tabular-nums">
          {thread.updatedLabel}
        </span>
      </span>
      {live ? (
        <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs/4">
          <Spinner className="size-3 shrink-0" aria-hidden="true" />
          <span className="text-foreground min-w-0 truncate">
            {activityLabel}
          </span>
        </span>
      ) : thread.artifact ? (
        <span className="flex min-w-0">
          <Badge
            variant="outline"
            size="sm"
            className="text-muted-foreground min-w-0 font-mono font-normal"
          >
            <span className="min-w-0 truncate">{thread.artifact}</span>
          </Badge>
        </span>
      ) : null}
    </Button>
  )
}

/** Header leading control: names the open thread and switches between them. */
function ThreadSwitcher({
  title,
  threads,
  favorites,
  activeThreadId,
  streaming,
  activityLabel,
  onSelectThread,
  onNewChat,
}: {
  title: string
  threads: ThreadRecord[]
  favorites: Record<string, boolean>
  activeThreadId: string
  streaming: boolean
  /** The streaming thread's current step, shown inline on its row. */
  activityLabel: string
  onSelectThread: (id: string) => void
  onNewChat: () => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(THREAD_TABS[0].id)

  function renderRow(thread: ThreadRecord) {
    return (
      <SwitcherRow
        key={thread.id}
        thread={thread}
        isActive={thread.id === activeThreadId}
        live={streaming && thread.id === activeThreadId}
        activityLabel={activityLabel}
        onSelect={(id) => {
          setOpen(false)
          onSelectThread(id)
        }}
      />
    )
  }

  return (
    // A tablist is invalid inside role="menu", so the surface is a popover and
    // every row is a real button rather than a menu item.
    <Popover open={open} onOpenChange={setOpen}>
      {/* Button ships shrink-0, so the switcher re-enables shrink: the title
          truncates instead of shoving the trailing controls off. */}
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="-ms-1 min-w-0 shrink gap-1.5 px-2 font-medium"
          />
        }
      >
        <span className="min-w-0 truncate">{title}</span>
        {ICON_CHEVRON}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex max-h-96 w-84 max-w-(--available-width) flex-col p-0"
      >
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(String(value))}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          {/* The strip never scrolls: it is shrink-0 and the list below owns
              the whole scroll, so no row can pass under it. */}
          <div className="border-border flex h-11 shrink-0 items-center gap-1 border-b px-2">
            {/* Zero padding plus a full-height trigger seats the line underline
                on the strip's own border instead of floating above it. */}
            <TabsList variant="line" className="h-full gap-0 p-0">
              {THREAD_TABS.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="h-full! flex-none px-2 after:-bottom-px!"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="New chat"
                    onClick={() => {
                      setOpen(false)
                      onNewChat()
                    }}
                    className="ms-auto"
                  />
                }
              >
                {ICON_NEW}
              </TooltipTrigger>
              <TooltipContent>New chat</TooltipContent>
            </Tooltip>
          </div>

          {THREAD_TABS.map((item) => (
            <TabsContent
              key={item.id}
              value={item.id}
              className="scrollbar min-h-0 flex-1 overflow-y-auto p-2"
            >
              {item.id === "all" ? (
                <div className="flex flex-col">
                  {groupsFor(threads, favorites).map((group) => (
                    <div
                      key={group.label}
                      className="flex flex-col gap-1 pt-3 first:pt-0"
                    >
                      <span className="text-muted-foreground px-2 text-xs">
                        {group.label}
                      </span>
                      {group.threads.map(renderRow)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {threadsForTab(item.id, threads, favorites).map(renderRow)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

export function ThreadHeader({
  title,
  threads,
  favorites,
  activeThreadId,
  streaming,
  activityLabel,
  collapsed,
  canCollapse,
  onSelectThread,
  onNewChat,
  onToggleFavorite,
  onToggleCollapsed,
  onCopyLink,
  onCopyTranscript,
}: {
  title: string
  threads: ThreadRecord[]
  /** Favourite state per thread, which also files the Pinned section. */
  favorites: Record<string, boolean>
  activeThreadId: string
  streaming: boolean
  activityLabel: string
  /** True while the earlier turns are folded behind the compaction marker. */
  collapsed: boolean
  /** False when the thread is too short to fold, and the control is dropped. */
  canCollapse: boolean
  onSelectThread: (id: string) => void
  onNewChat: () => void
  onToggleFavorite: () => void
  onToggleCollapsed: () => void
  onCopyLink: () => void
  onCopyTranscript: () => void
}) {
  /** A thread earns a switcher row before it can be filed under Pinned. */
  const pinnable = threads.some((thread) => thread.id === activeThreadId)
  const favorite = pinnable && Boolean(favorites[activeThreadId])

  return (
    // One row, one rule, no gradient: the thread below it is the surface, and
    // the chrome stops at the border.
    <header className="flex h-12 shrink-0 items-center gap-1 border-b px-3 sm:px-4">
      <ThreadSwitcher
        title={title}
        threads={threads}
        favorites={favorites}
        activeThreadId={activeThreadId}
        streaming={streaming}
        activityLabel={activityLabel}
        onSelectThread={onSelectThread}
        onNewChat={onNewChat}
      />

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Pin this thread"
              aria-pressed={favorite}
              aria-disabled={!pinnable}
              onClick={() => pinnable && onToggleFavorite()}
              className={pinnable ? undefined : "text-muted-foreground/50"}
            />
          }
        >
          {favorite ? ICON_STAR_ON : ICON_STAR}
        </TooltipTrigger>
        <TooltipContent>
          {!pinnable
            ? "Send a message to pin this chat"
            : favorite
              ? "Remove from pinned"
              : "Pin this thread"}
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Thread options"
            />
          }
        >
          {ICON_MORE}
        </DropdownMenuTrigger>
        {/* Only actions this block really performs: no dead rows. */}
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>This thread</DropdownMenuLabel>
            <DropdownMenuItem onClick={onCopyLink}>
              {ICON_LINK}
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyTranscript}>
              {ICON_TRANSCRIPT}
              Copy transcript
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {canCollapse ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Collapse earlier turns"
                aria-pressed={collapsed}
                aria-expanded={!collapsed}
                onClick={onToggleCollapsed}
                className="ms-auto"
              />
            }
          >
            {collapsed ? ICON_EXPAND : ICON_COLLAPSE}
          </TooltipTrigger>
          <TooltipContent>
            {collapsed ? "Show all turns" : "Collapse earlier turns"}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </header>
  )
}