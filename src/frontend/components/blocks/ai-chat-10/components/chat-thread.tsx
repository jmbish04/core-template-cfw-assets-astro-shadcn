import { memo, useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
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
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ContextChips } from "./context-chips"
import {
  ASSISTANT_NAME,
  MODELS,
  type ChatMessageRecord,
  type MessagePart,
} from "./data"
import { PartBody, partLength, partText, slicePart } from "./message-parts"
import { CopyIcon, CheckIcon, ListChecksIcon, RefreshCwIcon, ThumbsUpIcon, ThumbsDownIcon, CornerDownRightIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_COPY = (
  <CopyIcon aria-hidden="true" />
)

const ICON_CHECK = (
  <CheckIcon aria-hidden="true" />
)

const ICON_TASK = (
  <ListChecksIcon aria-hidden="true" />
)

const ICON_REGENERATE = (
  <RefreshCwIcon aria-hidden="true" />
)

const ICON_LIKE = (
  <ThumbsUpIcon aria-hidden="true" />
)

const ICON_DISLIKE = (
  <ThumbsDownIcon aria-hidden="true" />
)

const ICON_FOLLOW_UP = (
  <CornerDownRightIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
)

/** The house separator between rendered segments, never a typed character. */
function Dot() {
  return (
    <span
      aria-hidden="true"
      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
    />
  )
}

// ---------- reveal engine ----------

const TICK_MS = 30
/** Silent beat between parts, in reveal units, so they land one at a time. */
const PART_GAP = 14

/**
 * Types a reply out in ~1.3s at any length; instant under reduced motion.
 * `frozen` keeps what a Stop already showed instead of handing back the rest.
 */
function useRevealedReply(
  parts: MessagePart[],
  {
    active,
    frozen,
    onDone,
  }: { active: boolean; frozen: boolean; onDone?: () => void }
) {
  const total = parts.reduce(
    (sum, part, index) =>
      sum + partLength(part) + (index < parts.length - 1 ? PART_GAP : 0),
    0
  )
  const rate = Math.max(2, Math.ceil(total / 42))
  const [revealed, setRevealed] = useState(active ? rate : total)
  // The parent re-creates this on every render; the effect must not restart on it.
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (frozen) return
    if (!active) {
      setRevealed(total)
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(total)
      return
    }
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

  // Cut the reply at the revealed character; the caret rides the live tail.
  const shown: { part: MessagePart; caret: boolean }[] = []
  let start = 0
  for (const part of parts) {
    const local = revealed - start
    if (local <= 0) break
    const length = partLength(part)
    if (local >= length) {
      shown.push({ part, caret: false })
      start += length + PART_GAP
      continue
    }
    shown.push({ part: slicePart(part, local), caret: true })
    break
  }
  const last = shown[shown.length - 1]
  if (active && !frozen && revealed < total && last && !last.caret)
    last.caret = true
  return shown
}

// ---------- turns ----------

function TurnAction({
  label,
  icon,
  pressed,
  onClick,
}: {
  label: string
  icon: ReactNode
  /** Set only on real toggles; Copy, Task and Regenerate are plain buttons. */
  pressed?: boolean
  onClick?: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
            className={pressed ? "text-primary" : undefined}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Flattens a turn back to plain text, so Copy hands over what was read. */
function turnText(message: ChatMessageRecord) {
  return message.parts.map(partText).join("\n\n").trim()
}

/** A short handle for the toast that names what Add as task created. */
function taskLabel(message: ChatMessageRecord) {
  const words = turnText(message).split(/\s+/).slice(0, 6).join(" ")
  return words.length ? words : "Untitled task"
}

function CopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  return (
    <TurnAction
      label={copied ? "Copied" : "Copy"}
      icon={copied ? ICON_CHECK : ICON_COPY}
      onClick={() => {
        // Clipboard access is denied on an unfocused document, so the
        // confirmation waits for the write instead of claiming it.
        navigator.clipboard
          ?.writeText(text)
          .then(() => {
            toast("Copied to clipboard")
            setCopied(true)
            if (timer.current) window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => setCopied(false), 1400)
          })
          .catch(() => setCopied(false))
      }}
    />
  )
}

/**
 * The unified turn order: identity header, ghost bubble, action bar, follow
 * ups. Newest keeps its bar visible; older ones reveal on hover or focus.
 */
function AssistantTurn({
  message,
  newest,
  streaming,
  frozen,
  stopped,
  onRegenerate,
  onFollowUp,
  onDone,
}: {
  message: ChatMessageRecord
  newest: boolean
  streaming: boolean
  frozen: boolean
  stopped: boolean
  /** Passed only for the newest settled reply, the only one worth rerunning. */
  onRegenerate?: () => void
  onFollowUp: (text: string) => void
  onDone?: () => void
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null)
  const model = MODELS.find((item) => item.id === message.modelId)
  const revealed = useRevealedReply(message.parts, {
    active: streaming,
    frozen,
    onDone,
  })

  const followUps = newest && !streaming ? (message.followUps ?? []) : []

  return (
    <Message role="group" aria-label={ASSISTANT_NAME} className="group/turn">
      <MessageContent className="min-w-0 gap-1.5">
        {/* Turn header: which model answered, and when. The assistant is not
            named on every turn; only one voice ever speaks on this side. */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {model ? (
            <>
              <span className="text-foreground font-medium">{model.name}</span>
              <Dot />
            </>
          ) : null}
          <span className="tabular-nums">{message.at}</span>
        </div>

        <Bubble variant="ghost" className="w-full min-w-0">
          <BubbleContent className="min-w-0 space-y-3">
            {revealed.map((item, index) => (
              <PartBody key={index} part={item.part} caret={item.caret} />
            ))}
          </BubbleContent>
        </Bubble>

        {streaming ? null : (
          <MessageFooter className="gap-0.5">
            {stopped ? (
              <span className="text-muted-foreground pe-1 text-xs">
                Stopped by you
              </span>
            ) : null}
            {/* The row keeps its space either way, so nothing shifts when the
                hover reveal fades it in on older turns. */}
            <span
              className={cn(
                "flex items-center gap-0.5 transition-opacity",
                newest
                  ? "opacity-100"
                  : "pointer-events-none opacity-0 group-hover/turn:pointer-events-auto group-hover/turn:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-100"
              )}
            >
              <CopyAction text={turnText(message)} />
              <TurnAction
                label="Add as task"
                icon={ICON_TASK}
                onClick={() => toast(`Added "${taskLabel(message)}" to Tasks`)}
              />
              {onRegenerate ? (
                <TurnAction
                  label="Regenerate"
                  icon={ICON_REGENERATE}
                  onClick={onRegenerate}
                />
              ) : null}
              <TurnAction
                label={vote === "up" ? "Remove like" : "Good reply"}
                icon={ICON_LIKE}
                pressed={vote === "up"}
                onClick={() => setVote(vote === "up" ? null : "up")}
              />
              <TurnAction
                label={vote === "down" ? "Remove dislike" : "Bad reply"}
                icon={ICON_DISLIKE}
                pressed={vote === "down"}
                onClick={() => setVote(vote === "down" ? null : "down")}
              />
            </span>
          </MessageFooter>
        )}

        {followUps.length ? (
          <div
            role="group"
            aria-label="Follow ups"
            className="mt-1 flex flex-col gap-1.5"
          >
            <p className="text-muted-foreground text-xs font-medium">
              Follow ups
            </p>
            {followUps.map((text) => (
              <Bubble key={text} variant="outline" className="w-full">
                <BubbleContent
                  render={
                    <button type="button" onClick={() => onFollowUp(text)} />
                  }
                  className="text-muted-foreground hover:text-foreground flex w-full min-w-0 items-center gap-2 text-start"
                >
                  {ICON_FOLLOW_UP}
                  <span className="min-w-0 flex-1 truncate">{text}</span>
                </BubbleContent>
              </Bubble>
            ))}
          </div>
        ) : null}
      </MessageContent>
    </Message>
  )
}

function UserTurn({ message }: { message: ChatMessageRecord }) {
  return (
    <Message align="end" role="group" aria-label="You" className="group/turn">
      <MessageContent className="min-w-0 items-end gap-1.5">
        {message.contextIds?.length ? (
          // justify-end spills a too wide row out the start edge where it
          // cannot be scrolled back; an auto start margin ends it and scrolls.
          <ContextChips
            ids={message.contextIds}
            className="w-full [&>*:first-child]:ms-auto"
          />
        ) : null}
        <Bubble variant="muted" align="end" className="max-w-[85%]">
          <BubbleContent className="space-y-2">
            {message.parts.map((part, index) => (
              <PartBody key={index} part={part} />
            ))}
          </BubbleContent>
        </Bubble>
        <MessageFooter className="gap-0.5 pe-0">
          <span className="pointer-events-none flex items-center gap-0.5 opacity-0 transition-opacity group-hover/turn:pointer-events-auto group-hover/turn:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-100">
            <span className="text-muted-foreground pe-1 text-xs tabular-nums">
              {message.at}
            </span>
            <CopyAction text={turnText(message)} />
          </span>
        </MessageFooter>
      </MessageContent>
    </Message>
  )
}

// ---------- thread ----------

export function ChatThread({
  messages,
  streaming,
  stoppedIds,
  arrivingId,
  activityLabel,
  onRegenerate,
  onSend,
  onArrived,
}: {
  messages: ChatMessageRecord[]
  streaming: boolean
  /** Replies a Stop cut short, which must stay cut short from then on. */
  stoppedIds: string[]
  arrivingId: string | null
  /** The step the marker names while a reply is prepared. */
  activityLabel: string
  onRegenerate: () => void
  onSend: (text: string) => void
  onArrived: () => void
}) {
  const newestReplyId =
    [...messages].reverse().find((message) => message.role === "assistant")
      ?.id ?? null

  return (
    // Bottom following with no anchored item anywhere: a 400px panel would
    // strand a top-anchored reply below the fold.
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport className="scrollbar">
          <MessageScrollerContent
            aria-busy={streaming}
            // Same column as the composer below it, so both share one spine.
            className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-5 px-3 py-4 sm:px-4"
          >
            {messages.map((message) => {
              const arriving = message.id === arrivingId
              const isNewestReply = message.id === newestReplyId
              return (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={false}
                  // Opacity-only entrance: a transform here mismeasures the
                  // item extent and kills bottom following.
                  className="animate-in fade-in-0 duration-300 ease-out [content-visibility:visible] motion-reduce:animate-none"
                >
                  {message.role === "user" ? (
                    <UserTurn message={message} />
                  ) : (
                    <AssistantTurn
                      message={message}
                      newest={isNewestReply}
                      streaming={arriving}
                      frozen={stoppedIds.includes(message.id)}
                      stopped={stoppedIds.includes(message.id)}
                      onRegenerate={
                        isNewestReply && !streaming ? onRegenerate : undefined
                      }
                      onFollowUp={onSend}
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
                <Marker role="status">
                  <MarkerIcon>
                    <Spinner />
                  </MarkerIcon>
                  <MarkerContent>{activityLabel}</MarkerContent>
                </Marker>
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        {/* aria-busy silences the log, so the in-flight step is announced from
            outside it rather than not at all. */}
        <p role="status" aria-live="polite" className="sr-only">
          {streaming ? activityLabel : ""}
        </p>

        {/* Jump to latest, for when a read scrolls away from the newest turn. */}
        <MessageScrollerButton
          variant="outline"
          size="icon-sm"
          className="bottom-3 rounded-full shadow-sm"
        />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}