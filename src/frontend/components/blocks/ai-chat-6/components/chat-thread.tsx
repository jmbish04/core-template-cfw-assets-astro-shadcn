import { memo, useEffect, type ReactNode } from "react"
import {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/reui/code-block/code-block"

import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Marker, MarkerContent } from "@/components/ui/marker"
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
  useMessageScrollerScrollable,
} from "@/components/ui/message-scroller"
import type { AgentActions, AgentState } from "./agent"
import { BriefCard } from "./brief-card"
import {
  ASSISTANT_NAME,
  fixAddedLines,
  OPENING_FILE,
  PICKABLE_FILES,
  THREAD_SEPARATOR,
  VIEWER,
  type ChatMessageRecord,
  type FileKind,
  type FileRecord,
} from "./data"
import { ForkCard } from "./fork-card"
import { HandoffCard } from "./handoff-card"
import { PlanCard } from "./plan-card"
import { useRevealedText } from "./reveal"
import { CopyIcon, RefreshCwIcon, SquarePenIcon, LayersIcon, FileTextIcon, BarChart3Icon, ImageIcon } from "lucide-react"

/** The scroller measures item heights, and a skipped render reports a
    placeholder, which lands autoscroll short of the newest turn. */
const MEASURED_ITEM = "[content-visibility:visible]"
const ITEM_ENTRANCE = `${MEASURED_ITEM} animate-in fade-in-0 duration-300 ease-out motion-reduce:animate-none`
/** Turn actions stay out of the way until the turn is hovered or focused. */
const TURN_ACTIONS =
  "flex items-center opacity-0 transition-opacity duration-150 group-hover/turn:opacity-100 group-focus-within/turn:opacity-100 motion-reduce:transition-none"

/** Every file the thread can show, so a turn stores ids and not nodes. */
const ALL_FILES: FileRecord[] = [OPENING_FILE, ...PICKABLE_FILES]

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_COPY = (
  <CopyIcon className="size-3.5" aria-hidden="true" />
)

const ICON_RETRY = (
  <RefreshCwIcon className="size-3.5" aria-hidden="true" />
)

const ICON_EDIT = (
  <SquarePenIcon className="size-3.5" aria-hidden="true" />
)

const ICON_READING = (
  <LayersIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_FILE_DOC = (
  <FileTextIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_FILE_DATA = (
  <BarChart3Icon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_FILE_IMAGE = (
  <ImageIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

/** The record carries the kind; the nodes live here because IconPlaceholder
    needs static names. */
const FILE_ICON: Record<FileKind, ReactNode> = {
  doc: ICON_FILE_DOC,
  data: ICON_FILE_DATA,
  image: ICON_FILE_IMAGE,
}

const THINKING_MOTION = `
@keyframes ai6-sweep {
  0% { transform: translateX(-120%) }
  100% { transform: translateX(280%) }
}
.ai6-track { position: relative; overflow: hidden; }
.ai6-track::after {
  content: ""; position: absolute; inset-block: 0; inset-inline-start: 0;
  width: 38%; border-radius: 9999px; background: currentColor; opacity: 0.7;
  animation: ai6-sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .ai6-track::after { animation: none; opacity: 0 }
}
`

/** The in flight state says what the agent is reading, not that it is busy.
    The panel header announces it, so this row is decoration to a reader. */
function ThinkingRow({ label }: { label: string }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <style>{THINKING_MOTION}</style>
      <span className="text-muted-foreground flex min-w-0 shrink items-center gap-1.5 text-sm">
        {ICON_READING}
        <span className="truncate">{label}</span>
      </span>
      <span className="ai6-track bg-muted text-primary h-1 min-w-8 flex-1 rounded-full" />
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
                  className="bg-muted rounded-sm px-1 py-0.5 font-mono text-xs"
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

function TurnAction({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      onClick={onClick}
    >
      {icon}
    </Button>
  )
}

export function copyText(text: string, onDone: (ok: boolean) => void) {
  // Clipboard access is denied on an unfocused document, so the caller reports
  // the write instead of claiming it.
  navigator.clipboard
    ?.writeText(text)
    .then(() => onDone(true))
    .catch(() => onDone(false))
}

/** The config the answer drafted, as a file rather than a paragraph about one. */
function CodeArtifact({
  code,
  added,
}: {
  code: NonNullable<ChatMessageRecord["code"]>
  /** Lines the branch introduced, so the diff marks the decision. */
  added: number[]
}) {
  return (
    <CodeBlock
      code={code.body}
      language={code.language}
      showLineNumbers
      diff={{ added }}
      className="w-full min-w-0"
    >
      <CodeBlockHeader>
        <CodeBlockTitle className="truncate font-mono text-xs">
          {code.filename}
        </CodeBlockTitle>
        <span className="ms-auto flex items-center">
          <CodeBlockCopyButton />
        </span>
      </CodeBlockHeader>
    </CodeBlock>
  )
}

function AnswerSection({
  message,
  streaming,
  stopped,
  agent,
  actions,
  onCopy,
  onRetry,
  onShown,
}: {
  message: ChatMessageRecord
  streaming: boolean
  stopped: boolean
  agent: AgentState
  actions: AgentActions
  onCopy: (text: string) => void
  /** Present only on the newest reply: regenerating an older answer would
      splice the thread out of order. */
  onRetry?: () => void
  onShown: (text: string) => void
}) {
  const { shown, caret } = useRevealedText(message.text, {
    active: streaming,
    frozen: stopped,
  })
  const settled = !streaming && !stopped
  // Reports what is on screen while the reply types, so a Stop settles exactly
  // this much and no more.
  useEffect(() => {
    if (streaming && !stopped) onShown(shown)
  })

  return (
    <Message
      role="group"
      aria-label={
        message.title ? `${ASSISTANT_NAME}, ${message.title}` : ASSISTANT_NAME
      }
      className="group/turn"
    >
      <MessageContent className="min-w-0 gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
            {message.title}
          </h3>
          {/* The model is named only on answers produced after the reader
              could pick one, so the attribution is never invented. */}
          <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
            {message.model ? (
              <>
                <span className="max-w-28 truncate">{message.model}</span>
                <span
                  aria-hidden="true"
                  className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
                />
              </>
            ) : null}
            <span className="tabular-nums">{message.duration}</span>
          </span>
        </div>

        <Bubble variant="ghost" className="w-full min-w-0">
          <BubbleContent className="min-w-0 p-0">
            {/* tabular-nums so the percentages the argument rests on stop
                reflowing character by character while the reply types. */}
            <div className="selection:bg-primary/20 space-y-3 text-sm/6 tabular-nums">
              <Prose text={shown} caret={caret} />
            </div>
            {stopped ? (
              <div className="text-muted-foreground flex items-center gap-2 pt-3 text-xs">
                Stopped by you
                <span aria-hidden="true" className="bg-border h-px flex-1" />
              </div>
            ) : null}
          </BubbleContent>
        </Bubble>

        {message.code && settled ? (
          <CodeArtifact
            code={message.code}
            added={fixAddedLines(agent.forkValue)}
          />
        ) : null}

        {/* The control waits for the sentence that explains it: handing over a
            checkbox halfway through a paragraph reads as a glitch. */}
        {message.widget && settled ? (
          <div className="pt-1">
            {message.widget === "context" ? (
              <BriefCard
                answers={agent.brief}
                hasDownstream={agent.doneIds.length > 0 || agent.taskCreated}
                onSubmit={actions.onBriefSubmit}
                onReopen={actions.onBriefReopen}
              />
            ) : null}
            {message.widget === "plan" ? (
              <PlanCard
                stepIds={agent.stepIds}
                planRun={agent.planRun}
                doneIds={agent.doneIds}
                skippedIds={agent.skippedIds}
                failedId={agent.failedId}
                onStepToggle={actions.onStepToggle}
                onRun={actions.onPlanRun}
                onStop={actions.onPlanStop}
                onRetry={actions.onPlanRetry}
                onSkip={actions.onPlanSkip}
                onDownload={actions.onArtifactDownload}
              />
            ) : null}
            {message.widget === "fork" ? (
              <ForkCard
                value={agent.forkValue}
                droppedCount={agent.droppedCount}
                onAnswer={actions.onForkAnswer}
              />
            ) : null}
            {message.widget === "handoff" ? (
              <HandoffCard
                ownerId={agent.ownerId}
                dueId={agent.dueId}
                created={agent.taskCreated}
                artifacts={agent.artifacts}
                onOwnerChange={actions.onOwnerChange}
                onDueChange={actions.onDueChange}
                onCreate={actions.onTaskCreate}
                onCopyLink={actions.onTaskCopyLink}
              />
            ) : null}
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
              <TurnAction
                label="Copy answer"
                icon={ICON_COPY}
                onClick={() => onCopy(message.text)}
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
  onCopy,
  onEdit,
}: {
  message: ChatMessageRecord
  onCopy: (text: string) => void
  /** Loads the message back into the composer. */
  onEdit: (text: string) => void
}) {
  const files = message.fileIds
    ? ALL_FILES.filter((file) => message.fileIds?.includes(file.id))
    : []

  return (
    <Message
      align="end"
      role="group"
      aria-label={VIEWER.name}
      className="group/turn"
    >
      <MessageContent className="min-w-0 items-end gap-1.5">
        {/* Files ride above the question they came with, so the scope of the
            ask is read before the ask itself. */}
        {files.length ? (
          <AttachmentGroup
            aria-label={
              files.length === 1 ? "1 attached file" : `${files.length} files`
            }
            className="max-w-[88%] gap-2 self-end"
          >
            {files.map((file) => (
              <Attachment key={file.id} size="sm" className="max-w-56">
                <AttachmentMedia className="text-muted-foreground">
                  {FILE_ICON[file.kind]}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle className="text-xs">
                    {file.name}
                  </AttachmentTitle>
                  <AttachmentDescription className="text-xs tabular-nums">
                    {file.meta}
                  </AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            ))}
          </AttachmentGroup>
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
              onClick={() => onCopy(message.text)}
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
  thinking,
  thinkingLabel,
  arrivingId,
  stoppedIds,
  agent,
  actions,
  onSend,
  onCopy,
  onRetry,
  onEdit,
  onShown,
}: {
  messages: ChatMessageRecord[]
  /** Waiting, with nothing of the reply on screen yet. */
  thinking: boolean
  /** What the wait is spent on, named from the confirmed context. */
  thinkingLabel: string
  arrivingId: string | null
  /** Replies cut short, so their note survives the reveal ending. */
  stoppedIds: string[]
  agent: AgentState
  actions: AgentActions
  onSend: (text: string) => void
  onCopy: (text: string) => void
  onRetry: (prompt: string, replyId: string) => void
  onEdit: (text: string) => void
  onShown: (text: string) => void
}) {
  const groups = groupTurns(messages)
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")
  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  // A stopped answer never earned its follow ups.
  const followUps =
    thinking ||
    !lastAssistant ||
    arrivingId ||
    stoppedIds.includes(lastAssistant.id)
      ? []
      : (lastAssistant.followUps ?? [])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport className="scrollbar">
            <MessageScrollerContent
              aria-busy={thinking || arrivingId !== null}
              className="flex w-full min-w-0 flex-col gap-6 px-4 py-4"
            >
              <MessageScrollerItem
                scrollAnchor={false}
                className={MEASURED_ITEM}
              >
                <Marker variant="separator">
                  <MarkerContent>{THREAD_SEPARATOR}</MarkerContent>
                </Marker>
              </MessageScrollerItem>

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
                          onCopy={onCopy}
                          onEdit={onEdit}
                        />
                      ) : (
                        <AnswerSection
                          key={message.id}
                          message={message}
                          streaming={message.id === arrivingId}
                          stopped={stoppedIds.includes(message.id)}
                          agent={agent}
                          actions={actions}
                          onCopy={onCopy}
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
                  <ThinkingRow label={thinkingLabel} />
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
                        type="button"
                        variant="outline"
                        onClick={() => onSend(text)}
                        className="text-muted-foreground hover:text-foreground h-auto max-w-full justify-start py-1.5 font-normal"
                      >
                        <span className="min-w-0 truncate">{text}</span>
                      </Button>
                    ))}
                  </div>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>

          <ScrollFades />

          <MessageScrollerButton
            variant="outline"
            size="icon-sm"
            className="rounded-full shadow-sm"
          />
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  )
}