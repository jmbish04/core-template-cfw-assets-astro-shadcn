import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Marker, MarkerContent } from "@/components/ui/marker"
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScrollerScrollable,
} from "@/components/ui/message-scroller"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DigestTurn,
  FlagTurn,
  FollowUps,
  RosterTurn,
  SourceList,
  StepsTurn,
} from "./answer-parts"
import {
  THREAD_SEPARATOR,
  turnText,
  type EventRecord,
  type SlotRecord,
  type TurnRecord,
} from "./data"
import { PlanTurn, type PlanDecision } from "./plan-turn"
import { useRevealedText } from "./reveal"
import { SlotPicker } from "./slot-picker"
import { VoiceNote } from "./voice-note"
import { CopyIcon, RefreshCwIcon } from "lucide-react"

/** The scroller skips rendering off-screen items, so a long answer reports a
    10rem placeholder and bottom following lands short. */
const MEASURED_ITEM = "[content-visibility:visible]"

/** Opacity only: a transform entrance mismeasures the item's extent. */
const ITEM_ENTRANCE = `${MEASURED_ITEM} animate-in fade-in-0 duration-300 ease-out motion-reduce:animate-none`

/** The row keeps its space at rest, so nothing shifts when it fades in. */
const TURN_ACTIONS =
  "pointer-events-none flex items-center gap-0.5 opacity-0 transition-opacity group-hover/turn:pointer-events-auto group-hover/turn:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-100"

const ICON_COPY = (
  <CopyIcon className="size-3.5" aria-hidden="true" />
)

const ICON_REDO = (
  <RefreshCwIcon className="size-3.5" aria-hidden="true" />
)

/** Hands text to the clipboard where the browser allows it. */
export function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return
  void navigator.clipboard.writeText(text)
}

/** Softens whichever edge has more thread behind it, and only that edge. */
function ScrollFades() {
  const { start, end } = useMessageScrollerScrollable()

  return (
    <>
      <div
        aria-hidden="true"
        data-active={start}
        className="from-sidebar pointer-events-none absolute inset-x-0 top-0 h-6 bg-linear-to-b to-transparent opacity-0 transition-opacity duration-200 ease-out data-[active=true]:opacity-100 motion-reduce:transition-none"
      />
      <div
        aria-hidden="true"
        data-active={end}
        className="from-sidebar pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t to-transparent opacity-0 transition-opacity duration-200 ease-out data-[active=true]:opacity-100 motion-reduce:transition-none"
      />
    </>
  )
}

/** Copy and redo, on the answers where both mean something. */
function TurnActions({
  onCopy,
  onRedo,
}: {
  onCopy: () => void
  /** Omitted when nothing precedes the turn to answer again. */
  onRedo?: () => void
}) {
  return (
    <div className={TURN_ACTIONS}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Copy answer"
              onClick={onCopy}
              className="text-muted-foreground hover:text-foreground"
            />
          }
        >
          {ICON_COPY}
        </TooltipTrigger>
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>
      {onRedo ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Answer again"
                onClick={onRedo}
                className="text-muted-foreground hover:text-foreground"
              />
            }
          >
            {ICON_REDO}
          </TooltipTrigger>
          <TooltipContent>Try again</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

/** An assistant line, typing itself out while it is the arriving turn. */
function SaidBubble({ text, arriving }: { text: string; arriving: boolean }) {
  const shown = useRevealedText(text, arriving)

  return (
    <Bubble variant="outline" className="max-w-full">
      <BubbleContent className="text-sm leading-relaxed">{shown}</BubbleContent>
    </Bubble>
  )
}

/** What the panel is doing, named, while nothing of the reply has landed. */
function ThinkingRow({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Spinner className="size-3.5" />
      {label}
    </div>
  )
}

export function ChatThread({
  turns,
  schedule,
  pendingEvent,
  decisions,
  slotChoices,
  thinking,
  thinkingLabel,
  arrivingId,
  transcribingId,
  onSend,
  onAttachEvent,
  onApprove,
  onDecline,
  onSlotConfirm,
  onEditVoice,
  onResendVoice,
  onRedo,
  showSources,
}: {
  turns: TurnRecord[]
  schedule: EventRecord[]
  pendingEvent: EventRecord | null
  decisions: Record<string, PlanDecision>
  /** Slot id already sent, per turn. */
  slotChoices: Record<string, string>
  /** Waiting, with nothing of the reply on screen yet. */
  thinking: boolean
  thinkingLabel: string
  arrivingId: string | null
  /** The voice note still resolving to text, if any. */
  transcribingId: string | null
  onSend: (prompt: string) => void
  onAttachEvent: (id: string) => void
  onApprove: (turnId: string) => void
  onDecline: (turnId: string) => void
  onSlotConfirm: (turnId: string, slot: SlotRecord) => void
  onEditVoice: (text: string) => void
  onResendVoice: (text: string) => void
  onRedo: (turnId: string) => void
  /** Off hides the citation chips under an answer. */
  showSources: boolean
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport className="scrollbar">
            <MessageScrollerContent
              aria-busy={thinking || arrivingId !== null}
              className="flex w-full min-w-0 flex-col gap-4 px-4 py-4"
            >
              <MessageScrollerItem
                scrollAnchor={false}
                className={MEASURED_ITEM}
              >
                <Marker variant="separator">
                  <MarkerContent>{THREAD_SEPARATOR}</MarkerContent>
                </Marker>
              </MessageScrollerItem>

              {turns.map((turn, index) => {
                // Try again answers the ask above a turn, so the opening
                // greeting has nothing to offer.
                const redo = turns
                  .slice(0, index)
                  .some((e) => e.kind === "asked" || e.kind === "voice")
                  ? () => onRedo(turn.id)
                  : undefined
                return (
                  <MessageScrollerItem
                    key={turn.id}
                    messageId={turn.id}
                    // Top anchoring strands a sent turn below the fold in a panel
                    // this narrow; bottom following keeps the tail in view.
                    scrollAnchor={false}
                    className={ITEM_ENTRANCE}
                  >
                    {turn.kind === "asked" ? (
                      <div className="flex flex-col items-end gap-1">
                        <Bubble variant="default" align="end">
                          <BubbleContent className="text-sm leading-relaxed">
                            {turn.text}
                          </BubbleContent>
                        </Bubble>
                        {turn.context?.length ? (
                          <span className="text-muted-foreground text-xs">
                            {turn.context.join(", ")}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {turn.kind === "voice" ? (
                      <VoiceNote
                        seconds={turn.seconds}
                        transcript={turn.transcript}
                        transcribing={transcribingId === turn.id}
                        onCopy={() => copyText(turn.transcript)}
                        onEdit={() => onEditVoice(turn.transcript)}
                        onResend={() => onResendVoice(turn.transcript)}
                      />
                    ) : null}

                    {turn.kind === "said" ? (
                      <div className="group/turn flex flex-col gap-2">
                        <SaidBubble
                          text={turn.text}
                          arriving={arrivingId === turn.id}
                        />
                        {showSources && turn.sourceIds?.length ? (
                          <SourceList ids={turn.sourceIds} />
                        ) : null}
                        {arrivingId === turn.id ? null : (
                          <>
                            <TurnActions
                              onCopy={() => copyText(turnText(turn))}
                              onRedo={redo}
                            />
                            {turn.followUps?.length ? (
                              <FollowUps
                                prompts={turn.followUps}
                                onSend={onSend}
                              />
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}

                    {turn.kind === "steps" ? (
                      <div className="group/turn flex flex-col gap-2">
                        <StepsTurn lead={turn.lead} steps={turn.steps}>
                          {turn.text}
                        </StepsTurn>
                        <TurnActions
                          onCopy={() => copyText(turnText(turn))}
                          onRedo={redo}
                        />
                      </div>
                    ) : null}

                    {turn.kind === "plan" ? (
                      <PlanTurn
                        lead={turn.lead}
                        moves={turn.moves}
                        addId={turn.addId}
                        question={turn.question}
                        schedule={schedule}
                        pendingEvent={pendingEvent}
                        decision={decisions[turn.id] ?? "pending"}
                        onAttachEvent={onAttachEvent}
                        onApprove={() => onApprove(turn.id)}
                        onDecline={() => onDecline(turn.id)}
                      />
                    ) : null}

                    {turn.kind === "slots" ? (
                      <SlotPicker
                        lead={turn.lead}
                        options={turn.options}
                        question={turn.question}
                        taken={slotChoices[turn.id] ?? null}
                        onConfirm={(slot) => onSlotConfirm(turn.id, slot)}
                      />
                    ) : null}

                    {turn.kind === "roster" ? (
                      <div className="group/turn flex flex-col gap-2">
                        <RosterTurn lead={turn.lead} people={turn.people} />
                        <TurnActions
                          onCopy={() => copyText(turnText(turn))}
                          onRedo={redo}
                        />
                      </div>
                    ) : null}

                    {turn.kind === "digest" ? (
                      <div className="group/turn flex flex-col gap-2">
                        <DigestTurn
                          lead={turn.lead}
                          figures={turn.figures}
                          note={turn.note}
                        />
                        <TurnActions
                          onCopy={() => copyText(turnText(turn))}
                          onRedo={redo}
                        />
                      </div>
                    ) : null}

                    {turn.kind === "flag" ? (
                      <div className="group/turn flex flex-col gap-2">
                        <FlagTurn
                          tone={turn.tone}
                          title={turn.title}
                          detail={turn.detail}
                          action={turn.action}
                          onSend={onSend}
                        />
                        <TurnActions
                          onCopy={() => copyText(turnText(turn))}
                          onRedo={redo}
                        />
                      </div>
                    ) : null}
                  </MessageScrollerItem>
                )
              })}

              {thinking ? (
                <MessageScrollerItem
                  scrollAnchor={false}
                  className={ITEM_ENTRANCE}
                >
                  <ThinkingRow label={thinkingLabel} />
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
        <ScrollFades />
      </MessageScrollerProvider>
    </div>
  )
}