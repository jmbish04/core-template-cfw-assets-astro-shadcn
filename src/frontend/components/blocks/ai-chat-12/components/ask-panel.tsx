import { useEffect } from "react"

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
import { type Vote } from "./answer-parts"
import { AskEmpty } from "./ask-empty"
import { AskThread, copyText } from "./ask-thread"
import { Composer } from "./composer"
import { ASSISTANT_NAME, PRODUCT_NAME, turnText, type TurnRecord } from "./data"
import { type RetrievalPhase } from "./retrieval-trace"
import { SquarePenIcon, Settings2Icon, XIcon } from "lucide-react"

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

/**
 * The assistant, docked to the page edge and revealed on demand. Everything
 * the panel owns lives between a fixed header and a fixed composer.
 */
export function AskPanel({
  turns,
  arrivingId,
  retrieval,
  showEmpty,
  showSteps,
  onShowStepsChange,
  votes,
  contacted,
  onVote,
  onContact,
  onSend,
  onStop,
  onNewChat,
  onRedo,
}: {
  turns: TurnRecord[]
  arrivingId: string | null
  retrieval: {
    phase: RetrievalPhase
    matched: string[]
    readCount: number
  } | null
  /** True right after New chat, when the panel is on its zero state. */
  showEmpty: boolean
  showSteps: boolean
  onShowStepsChange: (show: boolean) => void
  votes: Record<string, Vote>
  contacted: Record<string, boolean>
  onVote: (turnId: string, vote: Vote) => void
  onContact: (turnId: string) => void
  onSend: (text: string) => void
  onStop: () => void
  onNewChat: () => void
  onRedo: (turnId: string) => void
}) {
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar()

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
      collapsible="offcanvas"
      aria-label={`${ASSISTANT_NAME} about ${PRODUCT_NAME}`}
      aria-hidden={offscreen || undefined}
      inert={offscreen || undefined}
    >
      {/* Floats over the transcript so the thread travels under it: the blur has
          content to blur and the gradient softens where a turn passes out of view. */}
      <SidebarHeader className="bg-sidebar/70 supports-backdrop-filter:bg-sidebar/60 after:from-sidebar absolute inset-x-0 top-0 z-20 gap-0 p-0 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-6 after:bg-linear-to-b after:to-transparent">
        <div className="flex min-h-12 items-center gap-1 px-3">
          <span className="min-w-0 truncate ps-1 text-sm font-medium">
            {ASSISTANT_NAME}
          </span>

          <div className="ms-auto flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="New question"
                    onClick={onNewChat}
                    className={MUTED_ICON_BUTTON}
                  />
                }
              >
                {ICON_NEW}
              </TooltipTrigger>
              <TooltipContent>New question</TooltipContent>
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
                        aria-label="Assistant settings"
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
                    checked={showSteps}
                    onCheckedChange={onShowStepsChange}
                    closeOnClick={false}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">Show reading</span>
                      <span className="text-muted-foreground truncate text-xs">
                        Which articles each answer came from
                      </span>
                    </span>
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Conversation</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() =>
                      copyText(turns.map(turnText).filter(Boolean).join("\n\n"))
                    }
                  >
                    Copy transcript
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={onNewChat}>
                    Clear conversation
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
                    aria-label="Hide the assistant"
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
          <AskEmpty onSend={onSend} />
        ) : (
          <AskThread
            turns={turns}
            arrivingId={arrivingId}
            retrieval={retrieval}
            showSteps={showSteps}
            votes={votes}
            contacted={contacted}
            onVote={onVote}
            onContact={onContact}
            onSend={onSend}
            onRedo={onRedo}
          />
        )}
      </SidebarContent>

      {/* The transcript's bottom fade is absolutely positioned, so it paints
          above anything in normal flow until the composer is raised past it. */}
      <SidebarFooter className="relative z-10 mt-2 shrink-0 gap-2 px-4 pt-2 pb-4">
        <Composer
          streaming={retrieval !== null || arrivingId !== null}
          onSend={onSend}
          onStop={onStop}
        />
      </SidebarFooter>
    </Sidebar>
  )
}