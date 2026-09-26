import { useEffect } from "react"
import { Badge } from "@/components/reui/badge"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AgentActions, AgentState } from "./agent"
import { ChatEmpty } from "./chat-empty"
import { ChatThread } from "./chat-thread"
import { Composer } from "./composer"
import { ASSISTANT_NAME, type ChatMessageRecord } from "./data"
import { ModelMenu } from "./model-menu"
import { BotIcon, PlusIcon, XIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_MARK = (
  <BotIcon className="size-4 shrink-0" aria-hidden="true" />
)

const ICON_NEW = (
  <PlusIcon className="size-4" aria-hidden="true" />
)

const ICON_CLOSE = (
  <XIcon aria-hidden="true" />
)

const MUTED_ICON_BUTTON = "text-muted-foreground hover:text-foreground"

export function ChatPanel({
  messages,
  thinking,
  thinkingLabel,
  /** The one status the panel reports, or null when nothing is in flight. */
  status,
  /** True while the status is a step count rather than a wait. */
  statusIsRun,
  /** False when the status is waiting on the reader, so nothing spins. */
  statusSpins,
  arrivingId,
  stoppedIds,
  showEmpty,
  agent,
  actions,
  modelId,
  onModelChange,
  starters,
  draft,
  onSend,
  onStop,
  onRetry,
  onEdit,
  onShown,
  onCopy,
  onNewChat,
}: {
  messages: ChatMessageRecord[]
  thinking: boolean
  thinkingLabel: string
  status: string | null
  statusIsRun: boolean
  statusSpins: boolean
  arrivingId: string | null
  stoppedIds: string[]
  /** True right after New chat, when the panel is on its zero state. */
  showEmpty: boolean
  agent: AgentState
  actions: AgentActions
  modelId: string
  onModelChange: (id: string) => void
  starters: string[]
  draft: { text: string; serial: number } | null
  onSend: (text: string) => void
  onStop: () => void
  onRetry: (prompt: string, replyId: string) => void
  onEdit: (text: string) => void
  onShown: (text: string) => void
  onCopy: (text: string) => void
  onNewChat: () => void
}) {
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar()

  // The hook reports false until it has measured, so the drawer opens on the
  // resolve rather than at boot and still plays its entrance.
  useEffect(() => {
    if (isMobile) setOpenMobile(true)
  }, [isMobile, setOpenMobile])

  // Off canvas leaves the composer and its buttons focusable behind the page.
  const offscreen = !isMobile && state === "collapsed"
  const contextCostsWork = agent.doneIds.length > 0 || agent.taskCreated

  return (
    <Sidebar
      side="right"
      variant="floating"
      collapsible="offcanvas"
      aria-label={ASSISTANT_NAME}
      aria-hidden={offscreen || undefined}
      inert={offscreen || undefined}
    >
      {/* px-4 so the header sits on the same spine as the transcript, the
          composer and the zero state. */}
      <SidebarHeader className="shrink-0 gap-0 border-b p-0">
        <div className="flex min-h-12 items-center gap-2 px-4">
          <span className="text-primary shrink-0">{ICON_MARK}</span>
          <ModelMenu modelId={modelId} onModelChange={onModelChange} />

          {/* The panel's one live region: a wait and a run never overlap, so
              this reports whichever is happening and nothing else does. */}
          <p
            role="status"
            aria-live="polite"
            className="flex min-w-0 shrink items-center"
          >
            {status ? (
              <Badge
                variant={
                  statusIsRun
                    ? "primary-light"
                    : statusSpins
                      ? "secondary"
                      : "warning-light"
                }
                radius="full"
                className="min-w-0 gap-1.5 font-normal tabular-nums"
              >
                {statusSpins ? (
                  <Spinner className="size-3 shrink-0" aria-hidden="true" />
                ) : null}
                <span className="truncate">{status}</span>
              </Badge>
            ) : null}
          </p>

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
          <ChatEmpty contextCount={agent.contextIds.length} />
        ) : (
          <ChatThread
            messages={messages}
            thinking={thinking}
            thinkingLabel={thinkingLabel}
            arrivingId={arrivingId}
            stoppedIds={stoppedIds}
            agent={agent}
            actions={actions}
            onSend={onSend}
            onCopy={onCopy}
            onRetry={onRetry}
            onEdit={onEdit}
            onShown={onShown}
          />
        )}
      </SidebarContent>

      {/* The transcript's bottom fade is absolutely positioned, so it paints
          above anything in normal flow until the composer is raised past it. */}
      <SidebarFooter className="relative z-10 shrink-0 gap-2 border-t px-4 pt-3 pb-4">
        <Composer
          streaming={thinking || arrivingId !== null}
          contextIds={agent.contextIds}
          onSourceToggle={actions.onSourceToggle}
          contextCostsWork={contextCostsWork}
          files={agent.files}
          onFileAdd={actions.onFileAdd}
          onFileRemove={actions.onFileRemove}
          starters={starters}
          draft={draft}
          onSend={onSend}
          onStop={onStop}
        />
      </SidebarFooter>
    </Sidebar>
  )
}