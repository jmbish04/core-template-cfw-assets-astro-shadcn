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
import { ChatThread, copyText } from "./chat-thread"
import { Composer } from "./composer"
import {
  ASSISTANT_NAME,
  THREADS,
  turnText,
  type EventRecord,
  type SlotRecord,
  type TurnRecord,
} from "./data"
import { type PlanDecision } from "./plan-turn"
import { SparklesIcon, ChevronDownIcon, PanelRightIcon, SquarePenIcon, Settings2Icon, XIcon } from "lucide-react"

const ICON_MARK = (
  <SparklesIcon className="size-4 shrink-0" aria-hidden="true" />
)

const ICON_SWITCHER = (
  <ChevronDownIcon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
)

const ICON_WIDTH = (
  <PanelRightIcon className="size-3.5" aria-hidden="true" />
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
  turns,
  schedule,
  pendingEvent,
  decisions,
  slotChoices,
  showEmpty,
  thinking,
  thinkingLabel,
  arrivingId,
  transcribingId,
  wide,
  onWideChange,
  modelId,
  onModelChange,
  modeId,
  onModeChange,
  draft,
  attached,
  onAttachEvent,
  onDetach,
  onSend,
  onVoice,
  onStop,
  onNewChat,
  onApprove,
  onDecline,
  onSlotConfirm,
  onRedo,
  onEditVoice,
  onResendVoice,
}: {
  threadId: string
  onThreadChange: (id: string) => void
  turns: TurnRecord[]
  schedule: EventRecord[]
  pendingEvent: EventRecord | null
  decisions: Record<string, PlanDecision>
  slotChoices: Record<string, string>
  /** True right after New chat, when the panel is on its zero state. */
  showEmpty: boolean
  thinking: boolean
  thinkingLabel: string
  arrivingId: string | null
  transcribingId: string | null
  wide: boolean
  onWideChange: (wide: boolean) => void
  modelId: string
  onModelChange: (id: string) => void
  modeId: string
  onModeChange: (id: string) => void
  draft: { text: string; serial: number } | null
  attached: EventRecord[]
  onAttachEvent: (id: string) => void
  onDetach: (id: string) => void
  onSend: (text: string) => void
  onVoice: (seconds: number) => void
  onStop: () => void
  onNewChat: () => void
  onApprove: (turnId: string) => void
  onDecline: (turnId: string) => void
  onSlotConfirm: (turnId: string, slot: SlotRecord) => void
  onRedo: (turnId: string) => void
  onEditVoice: (text: string) => void
  onResendVoice: (text: string) => void
}) {
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const recentId = useId()
  // The answer setting the panel owns, kept where the menu that sets it lives
  // rather than drilled down from the page.
  const [showSources, setShowSources] = useState(true)

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
                        <span className="text-muted-foreground min-w-0 truncate text-start text-xs">
                          {entry.preview}
                        </span>
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
            {/* Desktop only: the drawer already fills the width it can. */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Widen the panel"
                    aria-pressed={wide}
                    onClick={() => onWideChange(!wide)}
                    className={`${MUTED_ICON_BUTTON} aria-pressed:text-foreground max-md:hidden`}
                  />
                }
              >
                {ICON_WIDTH}
              </TooltipTrigger>
              <TooltipContent>{wide ? "Narrow" : "Widen"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="New chat"
                    onClick={onNewChat}
                    className={MUTED_ICON_BUTTON}
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
                    checked={showSources}
                    onCheckedChange={setShowSources}
                    closeOnClick={false}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">Show sources</span>
                      <span className="text-muted-foreground truncate text-xs">
                        Cite the documents behind an answer
                      </span>
                    </span>
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Chat</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() =>
                      copyText(turns.map(turnText).filter(Boolean).join("\n\n"))
                    }
                  >
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
                    onClick={toggleSidebar}
                    className={MUTED_ICON_BUTTON}
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
          <ChatEmpty onSend={onSend} />
        ) : (
          <ChatThread
            turns={turns}
            schedule={schedule}
            pendingEvent={pendingEvent}
            decisions={decisions}
            slotChoices={slotChoices}
            thinking={thinking}
            thinkingLabel={thinkingLabel}
            arrivingId={arrivingId}
            transcribingId={transcribingId}
            showSources={showSources}
            onSend={onSend}
            onAttachEvent={onAttachEvent}
            onApprove={onApprove}
            onDecline={onDecline}
            onSlotConfirm={onSlotConfirm}
            onEditVoice={onEditVoice}
            onResendVoice={onResendVoice}
            onRedo={onRedo}
          />
        )}
      </SidebarContent>

      {/* The transcript's bottom fade is absolutely positioned, so it paints
          above anything in normal flow until the composer is raised past it. */}
      <SidebarFooter className="relative z-10 mt-2 shrink-0 gap-2 px-4 pt-2 pb-4">
        <Composer
          streaming={thinking || arrivingId !== null || transcribingId !== null}
          modelId={modelId}
          onModelChange={onModelChange}
          modeId={modeId}
          onModeChange={onModeChange}
          schedule={schedule}
          onAttachEvent={onAttachEvent}
          draft={draft}
          attached={attached}
          onDetach={onDetach}
          onSend={onSend}
          onVoice={onVoice}
          onStop={onStop}
        />
      </SidebarFooter>
    </Sidebar>
  )
}