import { memo, useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Badge } from "@/components/reui/badge"
import { toast } from "sonner"

import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from "@/components/ui/attachment"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Marker, MarkerContent } from "@/components/ui/marker"
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScrollerScrollable,
} from "@/components/ui/message-scroller"
import {
  ASSISTANT_NAME,
  sourcesFor,
  VIEWER,
  type ChatMessageRecord,
  type SourceRecord,
} from "./data"
import { QuoteReplyPill } from "./quote-pill"
import { useRevealedText } from "./reveal"
import { MessageSquareTextIcon, CornerDownRightIcon, CopyIcon, ThumbsUpIcon, ThumbsDownIcon, RefreshCwIcon, PencilIcon, ChevronDownIcon, ClockIcon, FileTextIcon, VideoIcon } from "lucide-react"

/** The scroller skips rendering off-screen items, so a long answer reports a
    10rem placeholder and bottom following lands short. */
const MEASURED_ITEM = "[content-visibility:visible]"

/** Opacity only: a transform entrance mismeasures the item's extent. */
const ITEM_ENTRANCE = `${MEASURED_ITEM} animate-in fade-in-0 duration-300 ease-out motion-reduce:animate-none`

/** The row keeps its space at rest, so nothing shifts when it fades in. */
const TURN_ACTIONS =
  "pointer-events-none flex flex-wrap items-center gap-0.5 opacity-0 transition-opacity group-hover/turn:pointer-events-auto group-hover/turn:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-100"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_QUOTE = (
  <MessageSquareTextIcon aria-hidden="true" />
)

const ICON_SUGGEST = (
  <CornerDownRightIcon className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
)

const ICON_COPY = (
  <CopyIcon aria-hidden="true" />
)

const ICON_LIKE = (
  <ThumbsUpIcon aria-hidden="true" />
)

const ICON_DISLIKE = (
  <ThumbsDownIcon aria-hidden="true" />
)

const ICON_RETRY = (
  <RefreshCwIcon aria-hidden="true" />
)

const ICON_EDIT = (
  <PencilIcon aria-hidden="true" />
)

const ICON_CHEVRON = (
  <ChevronDownIcon className="size-4 shrink-0 transition-transform duration-200 group-aria-expanded/section:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
)

const ICON_CLOCK = (
  <ClockIcon className="size-3 shrink-0" aria-hidden="true" />
)

const ICON_FILE = (
  <FileTextIcon className="size-3 shrink-0" aria-hidden="true" />
)

const ICON_RECORDING = (
  <VideoIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

/** A band travelling inside its own clipped track: transform only, and it rests
    off the start edge so a paused loop shows an empty track, never a half draw. */
const THINKING_MOTION = `
@keyframes ai4-sweep {
  0% { transform: translateX(-120%) }
  100% { transform: translateX(280%) }
}
.ai4-track { position: relative; overflow: hidden; }
.ai4-track::after {
  content: ""; position: absolute; inset-block: 0; inset-inline-start: 0;
  width: 38%; border-radius: 9999px; background: currentColor; opacity: 0.7;
  animation: ai4-sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .ai4-track::after { animation: none; opacity: 0 }
}
`

/** The in flight state, designed rather than a stock spinner: the label says
    what is happening and the track says it is still happening. */
function ThinkingRow() {
  return (
    <div className="flex items-center gap-3">
      <style>{THINKING_MOTION}</style>
      <span className="text-muted-foreground shrink-0 text-sm">
        Getting a detailed report
      </span>
      <span
        aria-hidden="true"
        className="ai4-track bg-muted text-primary h-1 min-w-8 flex-1 rounded-full"
      />
    </div>
  )
}

/** Compared by content, not identity: the reveal hands the body a fresh string
    each tick, so a referential memo would never hit. */
const Prose = memo(function Prose({
  text,
  caret,
}: {
  text: string
  caret?: boolean
}) {
  const paragraphs = text.split("\n\n")

  return (
    <>
      {paragraphs.map((paragraph, index) => {
        // Backticked terms in the demo copy would render as literal backticks.
        const segments = paragraph.split(/`([^`]+)`/)
        return (
          <p key={index} className="whitespace-pre-wrap">
            {segments.map((segment, part) =>
              part % 2 === 1 ? (
                <code
                  key={part}
                  className="bg-muted rounded-sm px-1 py-0.5 font-mono text-[0.85em]"
                >
                  {segment}
                </code>
              ) : (
                segment
              )
            )}
            {/* The caret rides inside the last paragraph so it trails the final
                word instead of blocking onto its own line. */}
            {caret && index === paragraphs.length - 1 ? (
              <span
                className="bg-foreground ms-0.5 inline-block h-[1em] w-0.5 translate-y-0.5"
                aria-hidden="true"
              />
            ) : null}
          </p>
        )
      })}
    </>
  )
})

/** Recordings ride above the message they were sent with. Past one, the newest
    names the set and the line under it carries the count. */
function AttachedRecordings({ sources }: { sources: SourceRecord[] }) {
  const front = sources[sources.length - 1]

  return (
    <div
      role="group"
      aria-label={
        sources.length === 1
          ? "1 attached recording"
          : `${sources.length} attached recordings`
      }
      className="flex w-full max-w-[88%] flex-col items-end self-end"
    >
      <Attachment size="sm" className="w-full gap-2.5">
        <Avatar className="size-6 shrink-0">
          <AvatarImage src={front.owner.avatar} alt={front.owner.name} />
          <AvatarFallback className="text-[10px]">
            {front.owner.initials}
          </AvatarFallback>
        </Avatar>
        <AttachmentContent>
          <AttachmentTitle className="text-xs">{front.title}</AttachmentTitle>
          <AttachmentDescription className="text-[11px] tabular-nums">
            {front.meta}
          </AttachmentDescription>
        </AttachmentContent>
        <span className="text-muted-foreground shrink-0">{ICON_RECORDING}</span>
      </Attachment>
      {sources.length > 1 ? (
        <p className="text-muted-foreground pe-1 pt-1.5 text-[11px] tabular-nums">
          {sources.length} recordings attached
        </p>
      ) : null}
    </div>
  )
}

function TurnAction({
  label,
  icon,
  toggle = false,
  active = false,
  onClick,
}: {
  label: string
  icon: ReactNode
  /** Only a toggle carries aria-pressed; Copy and Retry are one shot. */
  toggle?: boolean
  active?: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      aria-pressed={toggle ? active : undefined}
      onClick={onClick}
      className={active ? "text-primary" : undefined}
    >
      {icon}
    </Button>
  )
}

export function copyText(text: string) {
  // Clipboard access is denied on an unfocused document, so the toast waits for
  // the write instead of claiming it.
  navigator.clipboard
    ?.writeText(text)
    .then(() => toast.success("Copied"))
    .catch(() => toast.error("Copy blocked"))
}

/** The line a persistent Reply quotes, so touch and keyboard reach the same
    capability a text selection does. */
function firstSentence(text: string) {
  const trimmed = text.trim()
  const end = trimmed.search(/[.?!]\s/)
  const sentence = end === -1 ? trimmed : trimmed.slice(0, end + 1)
  return sentence.length > 140 ? `${sentence.slice(0, 137)}...` : sentence
}

function AnswerSection({
  message,
  streaming,
  stopped,
  personalize,
  onQuote,
  onAttach,
  onRetry,
  onShown,
}: {
  message: ChatMessageRecord
  streaming: boolean
  stopped: boolean
  /** On, the answer names its grounding and lists the sources it read. */
  personalize: boolean
  onQuote: (quote: string) => void
  onAttach: (source: SourceRecord) => void
  /** Present only on the newest reply: regenerating an older answer would
      splice the thread out of order. */
  onRetry?: () => void
  onShown: (text: string) => void
}) {
  const bodyId = useId()
  const [open, setOpen] = useState(true)
  const [vote, setVote] = useState<"up" | "down" | null>(null)
  const { shown, caret } = useRevealedText(message.text, {
    active: streaming,
    frozen: stopped,
  })
  const sources = personalize ? sourcesFor(message.sourceIds) : []

  // Reports what is on screen while the reply types, so a Stop settles exactly
  // this much and no more.
  useEffect(() => {
    if (streaming && !stopped) onShown(shown)
  })

  return (
    <Message role="group" aria-label={ASSISTANT_NAME} className="group/turn">
      <MessageContent className="min-w-0 gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="bg-primary size-1.5 shrink-0 rounded-full"
          />
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium">
            {message.title}
          </h3>
          <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-[11px] tabular-nums">
            {ICON_CLOCK}
            {message.duration}
          </span>
          {streaming ? null : (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              aria-label={open ? "Collapse answer" : "Expand answer"}
              onClick={() => setOpen(!open)}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring group/section -me-1 flex shrink-0 rounded-full p-1 outline-none focus-visible:ring-2"
            >
              {ICON_CHEVRON}
            </button>
          )}
        </div>

        <Bubble variant="ghost" className="w-full min-w-0">
          <BubbleContent className="min-w-0 p-0">
            <div
              className={open ? undefined : "relative max-h-20 overflow-hidden"}
            >
              <div
                id={bodyId}
                data-answer-body="true"
                className="selection:bg-primary/20 space-y-3 text-sm/6"
              >
                <Prose text={shown} caret={caret} />
              </div>
              {open ? null : (
                <span
                  aria-hidden="true"
                  className="from-sidebar pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t to-transparent"
                />
              )}
            </div>
            {open ? null : (
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={false}
                aria-controls={bodyId}
                onClick={() => setOpen(true)}
                className="text-muted-foreground hover:text-foreground -ms-2 mt-1 h-7 font-normal"
              >
                Show more
              </Button>
            )}
            {stopped ? (
              <div className="text-muted-foreground flex items-center gap-2 pt-3 text-xs">
                Stopped by you
                <span aria-hidden="true" className="bg-border h-px flex-1" />
              </div>
            ) : null}
          </BubbleContent>
        </Bubble>

        {/* Personalize on: the reply hands back the documents it read, so the
            grounding is inspectable and each one attaches to the next turn. */}
        {personalize && !streaming && sources.length ? (
          <div
            role="group"
            aria-label="Sources this reply read"
            className="flex flex-wrap gap-1.5 pt-0.5"
          >
            {sources.map((source) => (
              <Badge
                key={source.id}
                variant="outline"
                radius="full"
                aria-label={`Attach ${source.title} to your next message`}
                onClick={() => onAttach(source)}
                render={<button type="button" />}
                className="text-muted-foreground hover:text-foreground hover:bg-accent max-w-full min-w-0 transition-colors"
              >
                {ICON_FILE}
                <span className="truncate">{source.title}</span>
              </Badge>
            ))}
          </div>
        ) : null}

        {/* The row is gone while the reply types: acting on half an answer is
            not an action the reader wants offered. */}
        {streaming ? null : (
          <MessageFooter className="gap-0.5">
            <span className={TURN_ACTIONS}>
              <span className="text-muted-foreground pe-1 text-xs tabular-nums">
                {message.at}
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Reply to this answer, quoting its first line"
                onClick={() => onQuote(firstSentence(message.text))}
                className="text-muted-foreground hover:text-foreground h-6 gap-1.5 px-1.5 text-xs font-normal"
              >
                <span className="[&>svg]:size-3.5">{ICON_QUOTE}</span>
                Reply
              </Button>
              <TurnAction
                label="Copy answer"
                icon={ICON_COPY}
                onClick={() => copyText(message.text)}
              />
              <TurnAction
                label={vote === "up" ? "Remove like" : "Like answer"}
                icon={ICON_LIKE}
                toggle
                active={vote === "up"}
                onClick={() => setVote(vote === "up" ? null : "up")}
              />
              <TurnAction
                label={vote === "down" ? "Remove dislike" : "Dislike answer"}
                icon={ICON_DISLIKE}
                toggle
                active={vote === "down"}
                onClick={() => setVote(vote === "down" ? null : "down")}
              />
              {onRetry ? (
                <TurnAction
                  label="Retry answer"
                  icon={ICON_RETRY}
                  onClick={onRetry}
                />
              ) : null}
            </span>
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )
}

function UserTurn({
  message,
  onEdit,
}: {
  message: ChatMessageRecord
  /** Loads the message back into the composer. */
  onEdit: (text: string) => void
}) {
  const sources = sourcesFor(message.sourceIds)

  return (
    <Message
      align="end"
      role="group"
      aria-label={VIEWER.name}
      className="group/turn"
    >
      <MessageContent className="min-w-0 items-end gap-1">
        {sources.length ? <AttachedRecordings sources={sources} /> : null}

        {/* The quote sits above the bubble, where the scope of the question is
            read before the question itself. */}
        {message.quote ? (
          <MessageHeader className="text-muted-foreground border-primary/50 max-w-[88%] min-w-0 justify-end gap-1.5 border-s-2 ps-2 text-xs italic">
            <span className="line-clamp-2 text-start">{message.quote}</span>
          </MessageHeader>
        ) : null}

        <Bubble variant="muted" align="end" className="max-w-[88%]">
          <BubbleContent className="text-sm/6">{message.text}</BubbleContent>
        </Bubble>

        <MessageFooter className="gap-0.5 pe-0">
          <span className={TURN_ACTIONS}>
            <span className="text-muted-foreground pe-1 text-xs tabular-nums">
              {message.at}
            </span>
            <TurnAction
              label="Copy message"
              icon={ICON_COPY}
              onClick={() => copyText(message.text)}
            />
            <TurnAction
              label="Edit message"
              icon={ICON_EDIT}
              onClick={() => onEdit(message.text)}
            />
          </span>
        </MessageFooter>
      </MessageContent>
    </Message>
  )
}

/** Consecutive turns from the same speaker render as one scroller item. */
function groupTurns(messages: ChatMessageRecord[]) {
  const groups: ChatMessageRecord[][] = []
  for (const message of messages) {
    const last = groups[groups.length - 1]
    if (last && last[0].role === message.role) {
      last.push(message)
      continue
    }
    groups.push([message])
  }
  return groups
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

export function ChatThread({
  messages,
  separator,
  thinking,
  arrivingId,
  stoppedIds,
  personalize,
  showFollowUps,
  onSend,
  onQuote,
  onAttach,
  onRetry,
  onEdit,
  onShown,
}: {
  messages: ChatMessageRecord[]
  separator?: string
  /** Waiting, with nothing of the reply on screen yet. */
  thinking: boolean
  arrivingId: string | null
  /** Replies cut short, so their note survives the reveal ending. */
  stoppedIds: string[]
  personalize: boolean
  /** Off, the last answer stops offering the next question. */
  showFollowUps: boolean
  onSend: (text: string) => void
  onQuote: (quote: string) => void
  onAttach: (source: SourceRecord) => void
  onRetry: (prompt: string, replyId: string) => void
  onEdit: (text: string) => void
  onShown: (text: string) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)

  const groups = groupTurns(messages)
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")
  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  // A stopped answer never earned its follow ups.
  const followUps =
    !showFollowUps ||
    thinking ||
    !lastAssistant ||
    arrivingId ||
    stoppedIds.includes(lastAssistant.id)
      ? []
      : (lastAssistant.followUps ?? [])

  return (
    <div ref={hostRef} className="relative flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport className="scrollbar">
            <MessageScrollerContent
              aria-busy={thinking || arrivingId !== null}
              className="flex w-full min-w-0 flex-col gap-6 px-4 py-4"
            >
              {separator ? (
                <MessageScrollerItem
                  scrollAnchor={false}
                  className={MEASURED_ITEM}
                >
                  <Marker variant="separator">
                    <MarkerContent>{separator}</MarkerContent>
                  </Marker>
                </MessageScrollerItem>
              ) : null}

              {groups.map((group) => (
                // Keyed on the first message so the item is stable, but pointed
                // at the last so the scroller never follows a stale row.
                <MessageScrollerItem
                  key={group[0].id}
                  messageId={group[group.length - 1].id}
                  // Top anchoring strands a sent turn below the fold in a panel
                  // this tall; bottom following keeps the tail in view.
                  scrollAnchor={false}
                  className={ITEM_ENTRANCE}
                >
                  <div className="flex flex-col gap-6">
                    {group.map((message) =>
                      message.role === "user" ? (
                        <UserTurn
                          key={message.id}
                          message={message}
                          onEdit={onEdit}
                        />
                      ) : (
                        <AnswerSection
                          key={message.id}
                          message={message}
                          streaming={message.id === arrivingId}
                          stopped={stoppedIds.includes(message.id)}
                          personalize={personalize}
                          onQuote={onQuote}
                          onAttach={onAttach}
                          onShown={onShown}
                          onRetry={
                            message.id === lastAssistant?.id && lastUser
                              ? () => onRetry(lastUser.text, message.id)
                              : undefined
                          }
                        />
                      )
                    )}
                  </div>
                </MessageScrollerItem>
              ))}

              {/* The activity row renders at the very end of the content, which
                  is what autoscroll pins to while the reply is still forming. */}
              {thinking ? (
                <MessageScrollerItem
                  scrollAnchor={false}
                  className={ITEM_ENTRANCE}
                >
                  <ThinkingRow />
                </MessageScrollerItem>
              ) : null}

              {/* Quick replies sit where the next turn would, so the thread
                  keeps reading downward instead of sprouting a toolbar. */}
              {followUps.length ? (
                <MessageScrollerItem
                  scrollAnchor={false}
                  className={MEASURED_ITEM}
                >
                  <div
                    role="group"
                    aria-label="Quick replies"
                    className="flex flex-col items-end gap-2"
                  >
                    {followUps.map((text) => (
                      // Outline, not tinted: a filled chip in the reader's
                      // column reads as a message already sent.
                      <Button
                        key={text}
                        variant="outline"
                        onClick={() => onSend(text)}
                        className="text-muted-foreground hover:text-foreground h-auto max-w-full justify-start gap-2 py-1.5 font-normal"
                      >
                        <span className="min-w-0 truncate">{text}</span>
                        {ICON_SUGGEST}
                      </Button>
                    ))}
                  </div>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>

          <ScrollFades />

          {/* aria-busy silences the log, so the in flight step is announced from
              outside it rather than not at all. */}
          <p role="status" aria-live="polite" className="sr-only">
            {thinking ? "Getting a detailed report" : ""}
          </p>

          <MessageScrollerButton
            variant="outline"
            size="icon-sm"
            className="rounded-full shadow-sm"
          />
        </MessageScroller>

        <QuoteReplyPill host={hostRef} onQuote={onQuote} />
      </MessageScrollerProvider>
    </div>
  )
}