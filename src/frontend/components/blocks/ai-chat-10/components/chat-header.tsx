"use client"

import { useState } from "react"
import { Badge } from "@/components/reui/badge"
import { toast } from "sonner"

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
import { CHATS, type ChatRecord } from "./data"
import { ChevronDownIcon, PlusIcon, BookmarkIcon, EllipsisVerticalIcon, LinkIcon, DownloadIcon } from "lucide-react"

/** Switcher tabs. `All` leads and stays the default, so the whole history is
    still one scan and the other three narrow it rather than hide it. */
const CHAT_TABS = [
  { id: "all", label: "All" },
  { id: "pinned", label: "Pinned" },
  { id: "today", label: "Today" },
  { id: "earlier", label: "Earlier" },
]

/** Groups the All tab heads with a label. Pinned lifts out of its recency
    there; a recency tab still shows it, since Today means everything today. */
const CHAT_GROUPS = [
  { label: "Pinned", chats: CHATS.filter((chat) => chat.pinned) },
  ...(
    [
      ["Today", "today"],
      ["Earlier", "earlier"],
    ] as const
  ).map(([label, recency]) => ({
    label,
    chats: CHATS.filter((chat) => !chat.pinned && chat.recency === recency),
  })),
].filter((group) => group.chats.length > 0)

function chatsForTab(tabId: string) {
  if (tabId === "pinned") return CHATS.filter((chat) => chat.pinned)
  return CHATS.filter((chat) => chat.recency === tabId)
}

function SwitcherRow({
  chat,
  isActive,
  live,
  activityLabel,
  onSelect,
}: {
  chat: ChatRecord
  isActive: boolean
  /** True while this chat's reply is still being written. */
  live: boolean
  activityLabel: string
  onSelect: (id: string) => void
}) {
  return (
    // Height follows content: a row with nothing in flight stays one tight line.
    <Button
      variant={isActive ? "secondary" : "ghost"}
      aria-current={isActive ? "true" : undefined}
      onClick={() => onSelect(chat.id)}
      className="h-auto w-full flex-col items-stretch justify-center gap-0.5 px-2 py-1.5 text-sm font-normal"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-start">{chat.title}</span>
        <span className="text-muted-foreground w-12 shrink-0 text-end text-[11px] tabular-nums">
          {chat.updatedLabel}
        </span>
      </span>
      {live ? (
        <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px]/4">
          <Spinner className="size-3 shrink-0" />
          <span className="min-w-0 truncate">{activityLabel}</span>
        </span>
      ) : null}
    </Button>
  )
}

/** Header leading control: names the open chat and switches between them. */
function ChatSwitcher({
  title,
  activeChatId,
  streaming,
  activityLabel,
  onSelectChat,
  onNewChat,
}: {
  title: string
  activeChatId: string
  streaming: boolean
  /** The streaming chat's current step, shown inline on its row. */
  activityLabel: string
  onSelectChat: (id: string) => void
  onNewChat: () => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(CHAT_TABS[0].id)

  function renderRow(chat: ChatRecord) {
    return (
      <SwitcherRow
        key={chat.id}
        chat={chat}
        isActive={chat.id === activeChatId}
        live={streaming && chat.id === activeChatId}
        activityLabel={activityLabel}
        onSelect={(id) => {
          setOpen(false)
          onSelectChat(id)
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
        <ChevronDownIcon className="opacity-60" data-icon="inline-end" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex max-h-96 w-80 max-w-(--available-width) flex-col p-0"
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
              {CHAT_TABS.map((item) => (
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
                <PlusIcon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>New chat</TooltipContent>
            </Tooltip>
          </div>

          {CHAT_TABS.map((item) => (
            <TabsContent
              key={item.id}
              value={item.id}
              className="scrollbar min-h-0 flex-1 overflow-y-auto p-2"
            >
              {item.id === "all" ? (
                <div className="flex flex-col">
                  {CHAT_GROUPS.map((group) => (
                    <div
                      key={group.label}
                      className="flex flex-col gap-1 pt-3 first:pt-0"
                    >
                      <span className="text-muted-foreground px-2 text-xs">
                        {group.label}
                      </span>
                      {group.chats.map(renderRow)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {chatsForTab(item.id).map(renderRow)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Page chrome for the chat: which chat is open, and the few actions that act on
 * it. The model picker sits in the composer, beside the ask it applies to.
 */
export function ChatHeader({
  title,
  activeChatId,
  streaming,
  activityLabel,
  memoryOn,
  onToggleMemory,
  onSelectChat,
  onNewChat,
}: {
  title: string
  activeChatId: string
  streaming: boolean
  activityLabel: string
  memoryOn: boolean
  onToggleMemory: () => void
  onSelectChat: (id: string) => void
  onNewChat: () => void
}) {
  function handleCopyLink() {
    navigator.clipboard
      .writeText(`https://chat.halcyon.dev/c/${activeChatId}`)
      .then(() => toast("Link copied"))
      .catch(() => toast.error("Copy failed"))
  }

  return (
    // Floats over the surface below, so it blurs whatever scrolls beneath it.
    <header className="bg-background/70 supports-backdrop-filter:bg-background/60 after:from-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 px-3 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-6 after:bg-gradient-to-b after:to-transparent sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ChatSwitcher
          title={title}
          activeChatId={activeChatId}
          streaming={streaming}
          activityLabel={activityLabel}
          onSelectChat={onSelectChat}
          onNewChat={onNewChat}
        />
        {/* Below md the transcript carries this state, where it has room. */}
        {streaming ? (
          <Badge
            variant="primary-light"
            size="sm"
            className="shrink-0 max-md:hidden"
          >
            Working
          </Badge>
        ) : null}
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New chat"
              onClick={onNewChat}
            />
          }
        >
          <PlusIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>New chat</TooltipContent>
      </Tooltip>

      {/* A filled variant, not a tint: the primary token reads as the
          foreground here, so colour alone would not show the state. */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={memoryOn ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Chat memory"
              aria-pressed={memoryOn}
              onClick={onToggleMemory}
              className="hidden sm:inline-flex"
            />
          }
        >
          <BookmarkIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>
          {memoryOn ? "Memory on for this chat" : "Memory off for this chat"}
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Chat options" />
          }
        >
          <EllipsisVerticalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        {/* Only actions the demo really performs: no dead rows. */}
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>This chat</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleCopyLink}>
              <LinkIcon aria-hidden="true" />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast(`Exporting "${title}" as Markdown`)}
            >
              <DownloadIcon aria-hidden="true" />
              Export transcript
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}