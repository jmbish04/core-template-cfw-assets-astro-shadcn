import { useEffect, useId, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChatEmpty } from "./chat-empty"
import { ChatThread } from "./chat-thread"
import { Composer } from "./composer"
import {
  ASSISTANT_NAME,
  THREADS,
  threadSourceCount,
  type ChatMessageRecord,
  type SourceRecord,
} from "./data"
import { BotIcon, ChevronDownIcon, SquarePenIcon, Settings2Icon, XIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_MARK = (
  <BotIcon className="size-4 shrink-0" aria-hidden="true" />
)

const ICON_SWITCHER = (
  <ChevronDownIcon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
)

const ICON_NEW = (
  <SquarePenIcon className="size-3.5" aria-hidden="true" />
)

const ICON_SETTINGS = (
  <Settings2Icon className="size-3.5" aria-hidden="true" />
)

const ICON_CLOSE = (
  <XIcon aria-hidden="true" />
)

const MUTED_ICON_BUTTON = "text-muted-foreground hover:text-foreground"

export function ChatPanel({
  threadId,
  onThreadChange,
  messages,
  separator,
  thinking,
  arrivingId,
  stoppedIds,
  showEmpty,
  quote,
  onQuoteChange,
  attachments,
  onAttach,
  onDetach,
  modelId,
  onModelChange,
  modeId,
  onModeChange,
  draft,
  onSend,
  onStop,
  onRetry,
  onEdit,
  onShown,
  onNewChat,
  onCopyTranscript,
}: {
  threadId: string
  onThreadChange: (id: string) => void
  messages: ChatMessageRecord[]
  separator?: string
  thinking: boolean
  arrivingId: string | null
  stoppedIds: string[]
  /** True right after New chat, when the panel is on its zero state. */
  showEmpty: boolean
  quote: string | null
  onQuoteChange: (quote: string | null) => void
  attachments: SourceRecord[]
  onAttach: (source: SourceRecord) => void
  onDetach: (id: string) => void
  modelId: string
  onModelChange: (id: string) => void
  modeId: string
  onModeChange: (id: string) => void
  draft: { text: string; serial: number } | null
  onSend: (text: string) => void
  onStop: () => void
  onRetry: (prompt: string, replyId: string) => void
  onEdit: (text: string) => void
  onShown: (text: string) => void
  onNewChat: () => void
  onCopyTranscript: () => void
}) {
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const recentId = useId()
  // The three answer settings the panel owns, gathered where the menu that
  // sets them lives rather than drilled down from the page.
  const [personalize, setPersonalize] = useState(true)
  const [webSearch, setWebSearch] = useState(true)
  const [showFollowUps, setShowFollowUps] = useState(true)
  const thread = THREADS.find((entry) => entry.id === threadId)
  const title = showEmpty ? ASSISTANT_NAME : (thread?.title ?? ASSISTANT_NAME)
  // `isMobile` is undefined on the first render, so the drawer opens on the
  // resolve rather than at boot and still plays its entrance.
  useEffect(() => {
    if (isMobile) setOpenMobile(true)
  }, [isMobile, setOpenMobile])

  // Off canvas leaves the composer and its buttons focusable behind the page.
  const offscreen = !isMobile && state === "collapsed"

  return (
    <Sidebar
      side="right"
      variant="floating"
      collapsible="offcanvas"
      aria-label={ASSISTANT_NAME}
      aria-hidden={offscreen || undefined}
      inert={offscreen || undefined}
    >
      <SidebarHeader className="shrink-0 gap-0 border-b p-0">
        <div className="flex min-h-12 items-center gap-1 px-3">
          <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  className="text-foreground -ms-1.5 h-8 min-w-0 justify-start gap-2 px-1.5 font-medium"
                />
              }
            >
              <span className="text-primary">{ICON_MARK}</span>
              <span className="min-w-0 truncate text-start text-sm">
                {title}
              </span>
              {ICON_SWITCHER}
            </PopoverTrigger>
            {/* One child, deliberately: the popover ships a flex column gap
                that would otherwise band the heading off from its list. */}
            <PopoverContent align="start" className="w-72 p-1">
              <div role="group" aria-labelledby={recentId}>
                <p
                  id={recentId}
                  className="text-muted-foreground px-2 pt-1 pb-1.5 text-xs"
                >
                  Recent
                </p>
                {THREADS.map((entry) => {
                  const current = entry.id === threadId && !showEmpty
                  // Only a thread that read something earns a second line, so
                  // the list keeps its rhythm instead of padding every row.
                  const read = threadSourceCount(entry)
                  return (
                    <Button
                      key={entry.id}
                      variant="ghost"
                      aria-current={current || undefined}
                      onClick={() => {
                        setSwitcherOpen(false)
                        onThreadChange(entry.id)
                      }}
                      className="aria-[current=true]:bg-muted aria-[current=true]:text-foreground dark:aria-[current=true]:bg-muted/50 h-auto w-full items-start justify-start gap-2 px-2 py-1.5 font-normal"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="min-w-0 truncate text-start text-sm">
                          {entry.title}
                        </span>
                        {read ? (
                          <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px]">
                            <span className="truncate">
                              {entry.opening.title}
                            </span>
                            <span
                              aria-hidden="true"
                              className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
                            />
                            <span className="shrink-0 tabular-nums">
                              {read === 1 ? "1 source" : `${read} sources`}
                            </span>
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {entry.at}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          <div className="ms-auto flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="New chat"
                    className={MUTED_ICON_BUTTON}
                    onClick={onNewChat}
                  />
                }
              >
                {ICON_NEW}
              </TooltipTrigger>
              <TooltipContent>New chat</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              {/* The span is load bearing: rendering the menu trigger as the
                  tooltip trigger merges away its keyboard open behaviour. */}
              <Tooltip>
                <TooltipTrigger render={<span className="flex" />}>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Chat settings"
                        className={MUTED_ICON_BUTTON}
                      />
                    }
                  >
                    {ICON_SETTINGS}
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-64">
                {/* Base UI throws on a label outside a group, and its checkbox
                    items already default to staying open on click. */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Answers</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={personalize}
                    onCheckedChange={setPersonalize}
                    closeOnClick={false}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm/5">Personalize</span>
                      <span className="text-muted-foreground truncate text-[11px]/4">
                        Read your workspace documents
                      </span>
                    </span>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={webSearch}
                    onCheckedChange={setWebSearch}
                    closeOnClick={false}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm/5">Search the web</span>
                      <span className="text-muted-foreground truncate text-[11px]/4">
                        Replies may browse public pages
                      </span>
                    </span>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showFollowUps}
                    onCheckedChange={setShowFollowUps}
                    closeOnClick={false}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm/5">
                        Follow up ideas
                      </span>
                      <span className="text-muted-foreground truncate text-[11px]/4">
                        Offer next questions after an answer
                      </span>
                    </span>
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Chat</DropdownMenuLabel>
                  <DropdownMenuItem onClick={onCopyTranscript}>
                    Copy transcript
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={onNewChat}>
                    Clear chat
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Hide assistant"
                    className={MUTED_ICON_BUTTON}
                    onClick={toggleSidebar}
                  />
                }
              >
                {ICON_CLOSE}
              </TooltipTrigger>
              <TooltipContent>Hide</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SidebarHeader>

      {/* The slot ships overflow-auto, which would nest a second scroll
          container inside the transcript's own viewport. */}
      <SidebarContent className="overflow-hidden">
        {showEmpty ? (
          <ChatEmpty onResume={onThreadChange} />
        ) : (
          <ChatThread
            messages={messages}
            separator={separator}
            thinking={thinking}
            arrivingId={arrivingId}
            stoppedIds={stoppedIds}
            personalize={personalize}
            showFollowUps={showFollowUps}
            onSend={onSend}
            onQuote={(text) => onQuoteChange(text)}
            onAttach={onAttach}
            onRetry={onRetry}
            onEdit={onEdit}
            onShown={onShown}
          />
        )}
      </SidebarContent>

      {/* The transcript's bottom fade is absolutely positioned, so it paints
          above anything in normal flow until the composer is raised past it. */}
      <SidebarFooter className="relative z-10 shrink-0 gap-2 px-4 pt-2 pb-4">
        <Composer
          streaming={thinking || arrivingId !== null}
          webSearch={webSearch}
          quote={quote}
          onQuoteChange={onQuoteChange}
          attachments={attachments}
          onAttach={onAttach}
          onDetach={onDetach}
          modelId={modelId}
          onModelChange={onModelChange}
          modeId={modeId}
          onModeChange={onModeChange}
          draft={draft}
          onSend={onSend}
          onStop={onStop}
        />
      </SidebarFooter>
    </Sidebar>
  )
}