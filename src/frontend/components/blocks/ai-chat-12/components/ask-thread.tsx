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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AnswerBubble,
  AnswerFeedback,
  ContactSupport,
  FollowUps,
  HandoffBubble,
  type Vote,
} from "./answer-parts"
import {
  THREAD_SEPARATOR,
  turnText,
  type AnswerBody,
  type HandoffBody,
  type TurnRecord,
} from "./data"
import {
  RetrievalLive,
  RetrievalReceipt,
  type RetrievalPhase,
} from "./retrieval-trace"
import { useRevealedText } from "./reveal"
import { CopyIcon, RefreshCwIcon } from "lucide-react"

/** The scroller skips rendering off-screen items, so a long answer reports a
    placeholder height and bottom following lands short. */
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

/** Softens the bottom edge when there is more thread below. The top edge belongs
    to the floating header, which fades it whether or not the thread is scrolled. */
function ScrollFades() {
  const { end } = useMessageScrollerScrollable()

  return (
    <>
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

/** A plain assistant line, typing itself out while it is the arriving turn. */
function SaidTurn({ text, arriving }: { text: string; arriving: boolean }) {
  const shown = useRevealedText(text, arriving)

  return (
    <Bubble variant="outline" className="max-w-full">
      <BubbleContent className="text-sm leading-relaxed">{shown}</BubbleContent>
    </Bubble>
  )
}

/** A sourced answer: its receipt, its prose, and what to do about it. */
function AnswerTurn({
  turn,
  arriving,
  showSteps,
  vote,
  onVote,
  contacted,
  onContact,
  onSend,
  onRedo,
}: {
  turn: { id: string } & AnswerBody
  arriving: boolean
  showSteps: boolean
  vote: Vote
  onVote: (vote: Vote) => void
  contacted: boolean
  onContact: () => void
  onSend: (prompt: string) => void
  onRedo?: () => void
}) {
  const shown = useRevealedText(turn.lead, arriving)

  return (
    <div className="group/turn flex flex-col gap-2">
      {showSteps ? (
        <RetrievalReceipt matched={turn.matched} usedIds={turn.usedIds} />
      ) : null}
      <AnswerBubble
        lead={shown}
        steps={turn.steps}
        note={turn.note}
        settled={!arriving}
      />
      {arriving ? null : (
        <>
          <div className="flex items-start gap-1">
            <AnswerFeedback
              vote={vote}
              onVote={onVote}
              contacted={contacted}
              onContact={onContact}
            />
            <TurnActions
              onCopy={() => copyText(turnText(turn))}
              onRedo={onRedo}
            />
          </div>
          {turn.followUps?.length ? (
            <FollowUps prompts={turn.followUps} onSend={onSend} />
          ) : null}
        </>
      )}
    </div>
  )
}

/** The miss, with the only thing left to offer under it. */
function HandoffTurn({
  turn,
  arriving,
  showSteps,
  contacted,
  onContact,
  onRedo,
}: {
  turn: { id: string } & HandoffBody
  arriving: boolean
  showSteps: boolean
  contacted: boolean
  onContact: () => void
  onRedo?: () => void
}) {
  const shown = useRevealedText(turn.lead, arriving)

  return (
    <div className="group/turn flex flex-col gap-2">
      {showSteps ? (
        <RetrievalReceipt matched={turn.matched} usedIds={[]} />
      ) : null}
      <HandoffBubble lead={shown} detail={turn.detail} settled={!arriving} />
      {arriving ? null : (
        <>
          {contacted ? null : <ContactSupport onContact={onContact} />}
          <TurnActions
            onCopy={() => copyText(turnText(turn))}
            onRedo={onRedo}
          />
        </>
      )}
    </div>
  )
}

export function AskThread({
  turns,
  arrivingId,
  retrieval,
  showSteps,
  votes,
  contacted,
  onVote,
  onContact,
  onSend,
  onRedo,
}: {
  turns: TurnRecord[]
  arrivingId: string | null
  /** The reply in flight, or null when nothing is being answered. */
  retrieval: {
    phase: RetrievalPhase
    matched: string[]
    readCount: number
  } | null
  /** Off folds every retrieval receipt away. */
  showSteps: boolean
  votes: Record<string, Vote>
  contacted: Record<string, boolean>
  onVote: (turnId: string, vote: Vote) => void
  onContact: (turnId: string) => void
  onSend: (prompt: string) => void
  onRedo: (turnId: string) => void
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport className="scrollbar">
            <MessageScrollerContent
              aria-busy={retrieval !== null || arrivingId !== null}
              className="flex w-full min-w-0 flex-col gap-4 px-4 pt-16 pb-4"
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
                // Try again answers the question above a turn, so a turn with
                // nothing asked before it has nothing to offer.
                const redo = turns
                  .slice(0, index)
                  .some((entry) => entry.kind === "asked")
                  ? () => onRedo(turn.id)
                  : undefined

                return (
                  <MessageScrollerItem
                    key={turn.id}
                    messageId={turn.id}
                    // Top anchoring strands a sent turn below the fold in a
                    // panel this narrow; bottom following keeps the tail in view.
                    scrollAnchor={false}
                    className={ITEM_ENTRANCE}
                  >
                    {turn.kind === "asked" ? (
                      <Bubble variant="default" align="end">
                        <BubbleContent className="text-sm leading-relaxed">
                          {turn.text}
                        </BubbleContent>
                      </Bubble>
                    ) : null}

                    {turn.kind === "said" ? (
                      <SaidTurn
                        text={turn.text}
                        arriving={arrivingId === turn.id}
                      />
                    ) : null}

                    {turn.kind === "answer" ? (
                      <AnswerTurn
                        turn={turn}
                        arriving={arrivingId === turn.id}
                        showSteps={showSteps}
                        vote={votes[turn.id] ?? null}
                        onVote={(vote) => onVote(turn.id, vote)}
                        contacted={Boolean(contacted[turn.id])}
                        onContact={() => onContact(turn.id)}
                        onSend={onSend}
                        onRedo={redo}
                      />
                    ) : null}

                    {turn.kind === "handoff" ? (
                      <HandoffTurn
                        turn={turn}
                        arriving={arrivingId === turn.id}
                        showSteps={showSteps}
                        contacted={Boolean(contacted[turn.id])}
                        onContact={() => onContact(turn.id)}
                        onRedo={redo}
                      />
                    ) : null}
                  </MessageScrollerItem>
                )
              })}

              {retrieval ? (
                <MessageScrollerItem
                  scrollAnchor={false}
                  className={ITEM_ENTRANCE}
                >
                  <RetrievalLive
                    phase={retrieval.phase}
                    matched={retrieval.matched}
                    readCount={retrieval.readCount}
                  />
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