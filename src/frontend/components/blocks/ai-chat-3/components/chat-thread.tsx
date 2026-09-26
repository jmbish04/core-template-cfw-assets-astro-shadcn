import {
  Fragment,
  memo,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockExpandButton,
  CodeBlockHeader,
  CodeBlockLanguage,
  CodeBlockTitle,
} from "@/components/reui/code-block/code-block"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
} from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@/components/ui/marker"
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { ChatQuestionnaire, type ScopeAnswer } from "./chat-questionnaire"
import { ContextChips } from "./context-chips"
import {
  ASSISTANT_NAME,
  THREAD_LINK_BASE,
  VIEWER,
  type ChatMessageRecord,
  type MessagePart,
} from "./data"
import { CopyIcon, ThumbsUpIcon, ThumbsDownIcon, LinkIcon, XIcon, RefreshCwIcon, CheckIcon, FileTextIcon, DownloadIcon, BrainIcon, ChevronDownIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_COPY = (
  <CopyIcon aria-hidden="true" />
)

const ICON_LIKE = (
  <ThumbsUpIcon aria-hidden="true" />
)

const ICON_DISLIKE = (
  <ThumbsDownIcon aria-hidden="true" />
)

const ICON_LINK = (
  <LinkIcon aria-hidden="true" />
)

const ICON_DISMISS = (
  <XIcon aria-hidden="true" />
)

const ICON_RETRY = (
  <RefreshCwIcon aria-hidden="true" />
)

const ICON_CHECK = (
  <CheckIcon aria-hidden="true" />
)

function CodeArtifact({
  part,
  streaming = false,
}: {
  part: Extract<MessagePart, { kind: "code" }>
  streaming?: boolean
}) {
  return (
    // w-full so the block fills the thread column instead of the w-fit bubble
    // sizing itself to the widest code line.
    <CodeBlock
      code={part.code}
      language={part.language}
      showLineNumbers
      streaming={streaming}
      className="w-full min-w-0"
    >
      <CodeBlockHeader>
        {/* Filename when the snippet is a real file, language when it is not. */}
        {part.filename ? (
          <CodeBlockTitle className="truncate">{part.filename}</CodeBlockTitle>
        ) : (
          <CodeBlockLanguage />
        )}
        <div className="ms-auto flex items-center gap-1">
          <CodeBlockExpandButton />
          <CodeBlockCopyButton />
        </div>
      </CodeBlockHeader>
      {/* The cap goes on the VIEWPORT, not the root: the viewport is height
          100% of the root, so a root-level cap clips without ever scrolling. */}
      <ScrollArea className="rounded-(--code-block-radius) **:data-[slot=scroll-area-viewport]:max-h-72">
        <CodeBlockContent />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </CodeBlock>
  )
}

/**
 * One reveal tick. 50ms rather than a frame: every tick grows the transcript,
 * which costs a resize observation, an autoscroll and a column relayout.
 */
const TICK_MS = 50
/** Pause between parts, so they land one at a time instead of running on. */
const GAP_TICKS = 3
/** Code runs faster than prose: it is not read line by line as it lands. */
const CODE_SPEEDUP = 2
/** How many visible steps a snippet arrives in, whatever its length. */
const CODE_PASSES = 24

/** Reveal units a part contributes to the reply's total. */
function partCost(part: MessagePart) {
  if (part.kind === "code") return Math.ceil(part.code.length / CODE_SPEEDUP)
  // Nothing to type in these, so each costs one beat and then lands whole.
  if (part.kind === "questionnaire") return 1
  if (part.kind === "file" || part.kind === "table") return 1
  return part.text.length
}

/** Reading pace, and the floor and cap on how long a reply may take. */
const CHARS_PER_TICK = 27
const MIN_TICKS = 29
const MAX_TICKS = 108

/**
 * One character rate for the whole reply, so a long answer takes longer than a
 * short one without ever dragging: about 1.5s at the floor, 5.4s at the cap.
 */
function revealRate(parts: MessagePart[]) {
  const typed = parts.reduce((total, part) => total + partCost(part), 0)
  const ticks = Math.min(
    MAX_TICKS,
    Math.max(MIN_TICKS, Math.round(typed / CHARS_PER_TICK))
  )
  return Math.max(2, Math.ceil(typed / ticks))
}

type RevealedPart = {
  part: MessagePart
  /** Trails the live text, so the reader can see where the reply is. */
  caret: boolean
  /** Hands a growing snippet to the code block's own streaming treatment. */
  streaming: boolean
}

/** Walks the reply front to back and cuts it at the revealed character. */
function sliceReply(
  parts: MessagePart[],
  revealed: number,
  rate: number
): RevealedPart[] {
  const gap = rate * GAP_TICKS
  const shown: RevealedPart[] = []
  let start = 0

  for (const part of parts) {
    const local = revealed - start
    if (local <= 0) break

    const cost = partCost(part)
    if (local >= cost) {
      shown.push({ part, caret: false, streaming: false })
      start += cost + gap
      continue
    }

    if (
      part.kind === "questionnaire" ||
      part.kind === "file" ||
      part.kind === "table"
    )
      break

    if (part.kind === "text") {
      shown.push({
        part: { ...part, text: part.text.slice(0, local) },
        caret: true,
        streaming: false,
      })
    } else {
      // Code lands a line at a time: there is no incremental tokenizer, so a
      // character level slice re-highlights the whole snippet every tick.
      const chars = local * CODE_SPEEDUP
      const lines = part.code.split("\n")
      const step = Math.max(1, Math.ceil(lines.length / CODE_PASSES))
      const reached = Math.floor((chars / part.code.length) * lines.length)
      const settled = Math.floor(reached / step) * step
      shown.push({
        part: {
          ...part,
          // Before the first group lands the opening line types, so the block
          // never sits there as an empty box.
          code: settled
            ? lines.slice(0, settled).join("\n") + "\n"
            : part.code.slice(0, chars),
        },
        caret: false,
        streaming: true,
      })
    }
    return shown
  }

  // Between parts the caret stays on the last line of text, so the reply reads
  // as still running rather than finished. Once every part is out it is gone.
  const last = shown[shown.length - 1]
  if (shown.length < parts.length && last?.part.kind === "text")
    last.caret = true
  return shown
}

/**
 * Streams a reply in part by part; instant under reduced motion. `frozen`
 * keeps whatever a Stop already showed; `onDone` reports the last chunk.
 */
function useRevealedReply(
  parts: MessagePart[],
  {
    active,
    frozen,
    onDone,
  }: { active: boolean; frozen: boolean; onDone?: () => void }
) {
  const rate = revealRate(parts)
  const gap = rate * GAP_TICKS
  const total = parts.reduce(
    (sum, part, index) =>
      sum + partCost(part) + (index < parts.length - 1 ? gap : 0),
    0
  )

  const [revealed, setRevealed] = useState(active ? rate : total)
  // The parent re-creates this on every render; an effect must not restart on it.
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    // A stopped reply keeps exactly the words it had produced, so the freeze
    // check has to win over the "not streaming, show everything" branch.
    if (frozen) return
    if (!active) {
      setRevealed(total)
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(total)
      return
    }
    // Starts on the first chunk rather than on nothing, so a reply never opens
    // with an empty bubble.
    setRevealed(rate)
    const timer = window.setInterval(() => {
      setRevealed((current) => Math.min(total, current + rate))
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [active, frozen, rate, total])

  // Reported rather than timed: only the reveal knows when the last chunk lands.
  useEffect(() => {
    if (!active || frozen || revealed < total) return
    doneRef.current?.()
  }, [active, frozen, revealed, total])

  return sliceReply(parts, revealed, rate)
}

/** True when a re-render would draw exactly what is already on screen. */
function samePart(a: MessagePart, b: MessagePart) {
  if (a.kind !== b.kind) return false
  if (a.kind === "text") return a.text === (b as typeof a).text
  if (a.kind === "questionnaire") return a.lead === (b as typeof a).lead
  if (a.kind === "file") return a.name === (b as typeof a).name
  if (a.kind === "table") return a.caption === (b as typeof a).caption
  return a.code === (b as typeof a).code
}

/**
 * Compared by content, not identity: the reveal hands every part a fresh
 * object each tick, so a referential memo would never hit.
 */
const PartBody = memo(
  function PartBody({
    part,
    caret,
    streaming,
    answers,
    onAnswer,
  }: {
    part: MessagePart
    caret?: boolean
    streaming?: boolean
    answers?: ScopeAnswer[]
    onAnswer?: (answers: ScopeAnswer[]) => void
  }) {
    if (part.kind === "code")
      return <CodeArtifact part={part} streaming={streaming} />

    if (part.kind === "file")
      return (
        <Attachment className="w-full max-w-xs">
          <AttachmentMedia>
            <FileTextIcon aria-hidden="true" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{part.name}</AttachmentTitle>
            <AttachmentDescription>{part.meta}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label={`Download ${part.name}`}
              onClick={() => toast(`Downloading ${part.name}`)}
            >
              <DownloadIcon aria-hidden="true" />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      )

    if (part.kind === "table")
      return (
        <figure className="flex flex-col gap-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{part.caption}</caption>
              <thead>
                <tr className="border-border border-b">
                  {part.columns.map((column, index) => (
                    <th
                      key={column}
                      scope="col"
                      className={cn(
                        "text-muted-foreground py-2 pe-4 text-start font-medium",
                        index > 0 && "tabular-nums"
                      )}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {part.rows.map((row) => (
                  <tr key={row[0]} className="border-border/60 border-b">
                    {row.map((cell, index) => (
                      <td
                        key={cell}
                        className={cn(
                          "py-2 pe-4",
                          index === 0 ? "font-medium" : "tabular-nums"
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <figcaption className="text-muted-foreground text-xs">
            {part.caption}
          </figcaption>
        </figure>
      )

    if (part.kind === "questionnaire")
      return (
        <ChatQuestionnaire
          part={part}
          answers={answers}
          onSubmit={(next) => onAnswer?.(next)}
        />
      )

    // `inline code` in the demo copy was rendering as literal backticks.
    const segments = part.text.split(/`([^`]+)`/)

    return (
      <p className="whitespace-pre-wrap">
        {segments.map((segment, index) =>
          index % 2 === 1 ? (
            <code
              key={index}
              className="bg-muted px-1 py-0.5 font-mono text-[0.85em]"
            >
              {segment}
            </code>
          ) : (
            segment
          )
        )}
        {/* The caret rides inside the last paragraph so it trails the final
            word instead of blocking onto its own line. */}
        {caret ? (
          <span
            className="bg-foreground ms-0.5 inline-block h-[1em] w-0.5 translate-y-0.5"
            aria-hidden="true"
          />
        ) : null}
      </p>
    )
  },
  (prev, next) =>
    prev.caret === next.caret &&
    prev.streaming === next.streaming &&
    prev.answers === next.answers &&
    samePart(prev.part, next.part)
)

/** Flattens a turn back to plain text, so Copy hands over what was read. */
function turnText(messages: ChatMessageRecord[]) {
  return messages
    .flatMap((message) =>
      message.parts.flatMap((part) => {
        if (part.kind === "code") return part.code
        if (part.kind === "table")
          return [
            part.columns.join("\t"),
            ...part.rows.map((r) => r.join("\t")),
          ]
        // Nothing here is text a reader can paste, so Copy skips it.
        if (part.kind !== "text") return []
        return part.text
      })
    )
    .join("\n\n")
    .trim()
}

function CopyAction({
  label,
  text,
  icon = ICON_COPY,
}: {
  label: string
  text: string
  icon?: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={copied ? "Copied" : label}
      onClick={() => {
        // Clipboard access is denied on an unfocused document, so the
        // confirmation waits for the write instead of claiming it.
        navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true)
            if (timer.current) window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => setCopied(false), 1400)
          })
          .catch(() => setCopied(false))
      }}
    >
      {copied ? ICON_CHECK : icon}
    </Button>
  )
}

/** The plan the reply worked to, folded away by default. Only a reply that
    bought a plan step carries one. */
function ReasoningDisclosure({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <Button
            variant="outline"
            className="text-muted-foreground hover:text-foreground h-auto w-full justify-start gap-2 px-3 py-2 font-normal"
          />
        }
      >
        <BrainIcon className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-start text-sm">
          Thought for {steps.length} steps
        </span>
        <ChevronDownIcon className="size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none" style={{ transform: open ? "rotate(180deg)" : undefined }} aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="text-muted-foreground mt-2 flex flex-col gap-2 ps-3 text-sm">
          {steps.map((step) => (
            <li key={step} className="flex gap-2.5">
              <span
                aria-hidden="true"
                className="bg-muted-foreground/40 mt-2 size-1 shrink-0 rounded-full"
              />
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** The house separator between rendered segments, never a typed character. */
function Dot() {
  return (
    <span
      aria-hidden="true"
      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
    />
  )
}

/** A footer action. `pressed` is set only on the real toggles. */
function TurnAction({
  label,
  icon,
  pressed,
  onClick,
}: {
  label: string
  icon: ReactNode
  pressed?: boolean
  onClick?: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={pressed ? "text-primary" : undefined}
    >
      {icon}
    </Button>
  )
}

function TurnFooter({
  at,
  note,
  copyText,
  copyLabel,
  detail,
  vote,
  onVote,
  onRetry,
  link,
  onDismiss,
}: {
  at: string
  /** Only a stopped reply carries one. */
  note?: string
  copyText: string
  copyLabel: string
  /** The model that answered, shown beside the time on assistant turns. */
  detail?: string
  vote?: "up" | "down" | null
  onVote?: (next: "up" | "down" | null) => void
  onRetry?: () => void
  /** A permalink to this turn, offered next to Copy. */
  link?: string
  /** Drops this turn from the thread. */
  onDismiss?: () => void
}) {
  return (
    <MessageFooter className="gap-0.5">
      {note ? (
        <span className="text-muted-foreground pe-1 text-xs">{note}</span>
      ) : null}
      {/* Time and actions share one reveal, and the row keeps its space so
          nothing shifts when it fades in. */}
      <span className="pointer-events-none flex items-center gap-0.5 opacity-0 transition-opacity group-hover/turn:pointer-events-auto group-hover/turn:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-100">
        <span className="text-muted-foreground flex items-center gap-1.5 pe-1 text-xs">
          {detail ? (
            <>
              <span>{detail}</span>
              <Dot />
            </>
          ) : null}
          <span className="tabular-nums">{at}</span>
        </span>
        {/* A stop before any words landed leaves nothing worth copying. */}
        {copyText ? <CopyAction label={copyLabel} text={copyText} /> : null}
        {link ? (
          <CopyAction label="Copy link" text={link} icon={ICON_LINK} />
        ) : null}
        {onVote ? (
          <>
            <TurnAction
              label={vote === "up" ? "Remove like" : "Like reply"}
              icon={ICON_LIKE}
              pressed={vote === "up"}
              onClick={() => onVote(vote === "up" ? null : "up")}
            />
            <TurnAction
              label={vote === "down" ? "Remove dislike" : "Dislike reply"}
              icon={ICON_DISLIKE}
              pressed={vote === "down"}
              onClick={() => onVote(vote === "down" ? null : "down")}
            />
          </>
        ) : null}
        {onRetry ? (
          <TurnAction label="Retry reply" icon={ICON_RETRY} onClick={onRetry} />
        ) : null}
        {onDismiss ? (
          <TurnAction
            label="Dismiss reply"
            icon={ICON_DISMISS}
            onClick={onDismiss}
          />
        ) : null}
      </span>
    </MessageFooter>
  )
}

/** One reply. Owns its own reveal, so only the arriving bubble animates. */
function ReplyBubble({
  parts,
  streaming,
  frozen,
  onDone,
  answers,
  onAnswer,
}: {
  parts: MessagePart[]
  streaming: boolean
  frozen: boolean
  onDone?: () => void
  answers?: ScopeAnswer[]
  onAnswer?: (answers: ScopeAnswer[]) => void
}) {
  const shown = useRevealedReply(parts, { active: streaming, frozen, onDone })

  return (
    <Bubble variant="ghost" className="w-full min-w-0">
      <BubbleContent className="min-w-0 space-y-3">
        {shown.map((item, index) => (
          <PartBody
            key={index}
            part={item.part}
            caret={item.caret}
            streaming={item.streaming}
            answers={answers}
            onAnswer={onAnswer}
          />
        ))}
      </BubbleContent>
    </Bubble>
  )
}

function AssistantTurn({
  messages,
  scopeAnswers,
  onScopeAnswer,
  modelName,
  onRetry,
  onDismiss,
  streaming = false,
  stopped = false,
  onDone,
}: {
  messages: ChatMessageRecord[]
  /** Submitted scope answers, keyed by the message that asked for them. */
  scopeAnswers: Record<string, ScopeAnswer[]>
  onScopeAnswer: (messageId: string, answers: ScopeAnswer[]) => void
  /** The model that answered, named under the turn. */
  modelName: string
  /** Passed only to the newest reply, the only one worth asking again. */
  onRetry?: () => void
  onDismiss: (messageId: string) => void
  streaming?: boolean
  stopped?: boolean
  onDone?: () => void
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null)
  const last = messages[messages.length - 1]

  return (
    <Message role="group" aria-label={ASSISTANT_NAME} className="group/turn">
      <MessageContent className="min-w-0 gap-1 pt-1">
        <BubbleGroup className="gap-5">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1
            // A stop before any words landed leaves an empty stub whose whole
            // job is the "Stopped by you" note in the footer.
            if (message.parts.length === 0) return null
            return (
              <Fragment key={message.id}>
                {message.reasoning?.length ? (
                  <ReasoningDisclosure steps={message.reasoning} />
                ) : null}
                <ReplyBubble
                  parts={message.parts}
                  streaming={streaming && isLast}
                  frozen={stopped && isLast}
                  onDone={isLast ? onDone : undefined}
                  answers={scopeAnswers[message.id]}
                  onAnswer={(next) => onScopeAnswer(message.id, next)}
                />
              </Fragment>
            )
          })}
        </BubbleGroup>

        {streaming ? null : (
          <TurnFooter
            at={last.at}
            detail={modelName}
            note={stopped ? "Stopped by you" : undefined}
            copyLabel="Copy reply"
            copyText={turnText(messages)}
            link={`${THREAD_LINK_BASE}${last.id}`}
            onDismiss={() => onDismiss(last.id)}
            vote={vote}
            onVote={setVote}
            onRetry={onRetry}
          />
        )}
      </MessageContent>
    </Message>
  )
}

function UserTurn({ messages }: { messages: ChatMessageRecord[] }) {
  const last = messages[messages.length - 1]

  return (
    <Message
      align="end"
      className="group/turn"
      role="group"
      aria-label={VIEWER.name}
    >
      <MessageContent className="min-w-0 gap-1">
        {/* Bubble and chips are siblings, not nested: a wrapper here would
            compound the primitive's own width cap and wrap the text early. */}
        <BubbleGroup className="w-full items-end gap-1.5">
          {messages.map((message) => (
            <Fragment key={message.id}>
              <Bubble variant="muted" align="end">
                <BubbleContent className="space-y-2">
                  {message.parts.map((part, index) => (
                    <PartBody key={index} part={part} />
                  ))}
                </BubbleContent>
              </Bubble>
              {/* What the assistant was handed, kept with the turn that sent
                  it rather than only in the composer it left. */}
              <ContextChips ids={message.contextIds ?? []} className="gap-2" />
            </Fragment>
          ))}
        </BubbleGroup>

        <TurnFooter
          at={last.at}
          copyLabel="Copy message"
          copyText={turnText(messages)}
        />
      </MessageContent>
    </Message>
  )
}

/** Consecutive turns from the same speaker render under one avatar. */
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

export function ChatThread({
  messages,
  scopeAnswers,
  onScopeAnswer,
  modelName,
  onRetry,
  onDismiss,
  separator,
  streaming,
  activity,
  arrivingId,
  stoppedIds,
  onArrived,
}: {
  messages: ChatMessageRecord[]
  /** Submitted scope answers, keyed by the message that asked for them. */
  scopeAnswers: Record<string, ScopeAnswer[]>
  onScopeAnswer: (messageId: string, answers: ScopeAnswer[]) => void
  /** The model that answered, named under every assistant turn. */
  modelName: string
  /** Regenerates the newest reply. */
  onRetry: () => void
  /** Drops one reply from the thread. */
  onDismiss: (messageId: string) => void
  /** Labels the top of the scrollback, so the thread has a date spine. */
  separator: string
  streaming: boolean
  /** The step named in the thinking Marker while a reply is on its way. */
  activity: string
  arrivingId: string | null
  /** Replies a Stop cut short, which stay cut short from then on. */
  stoppedIds: string[]
  /** Reported by the reveal when its last chunk lands. */
  onArrived: () => void
}) {
  // Asking again only makes sense for the answer that is actually last.
  const newestReplyId =
    [...messages].reverse().find((item) => item.role === "assistant")?.id ??
    null

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport className="scrollbar">
          <MessageScrollerContent
            aria-busy={streaming}
            // Extra bottom padding so a streaming reply settles clear of the
            // composer instead of typing itself against its top edge.
            className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6 px-4 pt-6 pb-16 sm:px-6"
          >
            {/* Unanchored items follow the bottom; visible content-visibility
                keeps the scroller measuring true heights, never a placeholder. */}
            <MessageScrollerItem
              scrollAnchor={false}
              className="[content-visibility:visible]"
            >
              <Marker variant="separator">
                <MarkerContent>{separator}</MarkerContent>
              </Marker>
            </MessageScrollerItem>

            {groupTurns(messages).map((group) => {
              const arriving = group.some((item) => item.id === arrivingId)
              return (
                <MessageScrollerItem
                  key={group[0].id}
                  messageId={group[group.length - 1].id}
                  scrollAnchor={false}
                  // Opacity only: a transform entrance mismeasures the item's
                  // extent and breaks the scroller's bottom following.
                  className="animate-in fade-in-0 duration-300 ease-out [content-visibility:visible] motion-reduce:animate-none"
                >
                  {group[0].role === "user" ? (
                    <UserTurn messages={group} />
                  ) : (
                    <AssistantTurn
                      messages={group}
                      scopeAnswers={scopeAnswers}
                      onScopeAnswer={onScopeAnswer}
                      modelName={modelName}
                      onDismiss={onDismiss}
                      onRetry={
                        group.some((item) => item.id === newestReplyId)
                          ? onRetry
                          : undefined
                      }
                      streaming={arriving}
                      stopped={group.some((item) =>
                        stoppedIds.includes(item.id)
                      )}
                      onDone={arriving ? onArrived : undefined}
                    />
                  )}
                </MessageScrollerItem>
              )
            })}

            {streaming && !arrivingId ? (
              <MessageScrollerItem
                scrollAnchor={false}
                className="[content-visibility:visible]"
              >
                <Marker>
                  <MarkerIcon>
                    <Spinner />
                  </MarkerIcon>
                  <MarkerContent className="shimmer">{activity}</MarkerContent>
                </Marker>
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        {/* aria-busy silences the log, so the in-flight step is announced from
            outside it rather than not at all. */}
        <p role="status" aria-live="polite" className="sr-only">
          {streaming ? activity : ""}
        </p>

        {/* Pill jump to latest, shown only while the reader is scrolled up. */}
        <MessageScrollerButton
          variant="outline"
          size="icon-sm"
          className="bottom-4 rounded-full shadow-sm"
        />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}