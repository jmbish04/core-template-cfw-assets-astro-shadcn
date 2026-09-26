"use client"

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { IconStack } from "@/components/reui/icon-stack"
import { cn } from "@/lib/utils"

import {
  Attachment,
  AttachmentContent,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@/components/ui/marker"
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
  useMessageScroller,
} from "@/components/ui/message-scroller"
import { ActivitySteps } from "./activity-steps"
import {
  ASSISTANT_NAME,
  modelName,
  modelShortName,
  nodeText,
  sourceList,
  SOURCES,
  STARTERS,
  VIEWER,
  type ActivityStep,
  type ChatNodeRecord,
} from "./data"
import {
  hasCitation,
  partLength,
  ReplyBody,
  useRevealBudget,
} from "./message-parts"
import { ReasoningDisclosure, SourceGlyph, SourceStrip } from "./reply-detail"
import { type PathEntry } from "./thread-tree"
import {
  ActionReveal,
  CopyAction,
  EditAction,
  RegenerateAction,
  VoteActions,
  type Vote,
} from "./turn-actions"
import { GitBranchIcon, CornerDownRightIcon, ArrowUpIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_BRANCH = (
  <GitBranchIcon aria-hidden="true" />
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

/** The word a version chip leads with: the model for a reply, the state of
    the message for an edit fork. */
function chipName(node: ChatNodeRecord) {
  if (node.role === "user") return node.edited ? "Edited" : "Original"
  return modelShortName(node.modelId ?? "")
}

/** Where the fork sat on screen when a chip was pressed. */
type PinRef = { current: { messageId: string; margin: number } | null }

/** Records the fork's on-screen offset so the swap can be held there. */
function capturePin(target: HTMLElement, pin: PinRef) {
  const item = target.closest<HTMLElement>("[data-message-id]")
  const viewport = target.closest<HTMLElement>(
    '[data-slot="message-scroller-viewport"]'
  )
  const content = target.closest<HTMLElement>(
    '[data-slot="message-scroller-content"]'
  )
  if (!item || !viewport || !content) return
  // scrollMargin is measured from under the content padding, so it comes off.
  const pad =
    Number.parseFloat(window.getComputedStyle(content).paddingTop) || 0
  pin.current = {
    messageId: item.dataset.messageId ?? "",
    margin:
      item.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top -
      pad,
  }
}

/** Replays the held position right after a version swap commits: the
    scroller's own spacer covers any height a shorter subtree gave up. */
function ForkPin({ pin }: { pin: PinRef }) {
  const { scrollToMessage } = useMessageScroller()
  useLayoutEffect(() => {
    const held = pin.current
    if (!held) return
    pin.current = null
    scrollToMessage(held.messageId, {
      align: "start",
      scrollMargin: held.margin,
    })
  })
  return null
}

/** The fork as a first-class object: one chip per version on the separator,
    active one filled, so any version is one direct click away. */
function BranchRail({
  entry,
  pin,
  onSelectVersion,
}: {
  entry: PathEntry
  pin: PinRef
  onSelectVersion: (forkKey: string, id: string) => void
}) {
  const { node, versions, index, forkKey } = entry
  const heading =
    node.role === "user"
      ? node.edited
        ? "Edited here"
        : "Original"
      : "Regenerated here"

  return (
    <Marker variant="separator">
      <MarkerIcon>{ICON_BRANCH}</MarkerIcon>
      <MarkerContent className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px]">
        <span className="max-sm:sr-only">{heading}</span>
        <span
          role="group"
          aria-label={
            node.role === "user" ? "Message versions" : "Reply versions"
          }
          className="flex flex-wrap items-center justify-center gap-1 tracking-normal normal-case"
        >
          {versions.map((version, at) => {
            const active = at === index
            const label =
              version.role === "user"
                ? chipName(version)
                : modelName(version.modelId ?? "")
            // Every turn made in session stamps "Now" and the current model,
            // so two regenerates would otherwise be one indistinguishable pair.
            const collides = versions.some(
              (other, index) =>
                index !== at &&
                other.at === version.at &&
                chipName(other) === chipName(version)
            )
            return (
              // size xs already is h-6 gap-1 px-2 text-xs, and Button carries
              // the house focus ring every other control here uses.
              <Button
                key={version.id}
                size="xs"
                variant={active ? "default" : "ghost"}
                aria-label={`Version ${at + 1} of ${versions.length}, ${label}, ${version.at}`}
                aria-current={active ? "true" : undefined}
                onClick={(event) => {
                  if (active) return
                  capturePin(event.currentTarget, pin)
                  onSelectVersion(forkKey, version.id)
                }}
                className={cn(
                  // sera uppercases every button, and a version stamp must not
                  // shout; the press is a no-op, so the active hover holds.
                  "rounded-full font-medium tracking-normal normal-case",
                  active
                    ? "hover:bg-primary border-transparent"
                    : "border-border text-muted-foreground"
                )}
              >
                <span>{chipName(version)}</span>
                <span
                  className={cn(
                    "font-normal tabular-nums",
                    active ? "text-primary-foreground/70" : "opacity-70"
                  )}
                >
                  {collides ? `${version.at} v${at + 1}` : version.at}
                </span>
              </Button>
            )
          })}
        </span>
        <span aria-hidden="true" className="text-[11px] tabular-nums">
          {index + 1} / {versions.length}
        </span>
        <span aria-live="polite" className="sr-only">
          Version {index + 1} of {versions.length}
        </span>
      </MarkerContent>
    </Marker>
  )
}

function AssistantTurn({
  entry,
  newest = false,
  followUps,
  streaming = false,
  stopped = false,
  diffAgainst,
  regenerateLabel,
  vote,
  onVote,
  onFollowUp,
  onRegenerate,
  onStopTruncate,
  onRevealDone,
}: {
  entry: PathEntry
  /** The last turn on the visible path: its action bar stays on at rest. */
  newest?: boolean
  /** Already gated to the newest settled reply, so no stale chip renders. */
  followUps: string[]
  streaming?: boolean
  stopped?: boolean
  /** The version this one replaced on screen, for the arrival tint. */
  diffAgainst?: string
  /** The model a regenerate would use, named on the control. */
  regenerateLabel: string
  /** The rating this turn already carries, held by the conversation. */
  vote: Vote | null
  onVote: (id: string, next: Vote | null) => void
  onFollowUp: (text: string) => void
  onRegenerate: (id: string) => void
  onStopTruncate: (id: string, budget: number) => void
  onRevealDone: (id: string) => void
}) {
  const { node } = entry
  /** The source a citation or a source chip put in focus, either way round. */
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const budget = useRevealBudget(node.id, node.parts, streaming, stopped, () =>
    onRevealDone(node.id)
  )
  const total = node.parts.reduce((sum, part) => sum + partLength(part), 0)
  const sources = useMemo(() => sourceList(node.sources), [node.sources])
  /** A reply that cites nothing still lists what it read, just unnumbered. */
  const cited = sources.length > 0 && hasCitation(node.parts)
  /** Stable identity, or the part memo below never hits on a reveal tick. */
  const cite = useMemo(
    () =>
      cited
        ? { sources, activeSourceId, onCite: setActiveSourceId }
        : undefined,
    [cited, sources, activeSourceId]
  )

  // Once per turn: a heading persists whole, so the write cannot always reach
  // the budget and an unguarded effect would re-fire on its own commit.
  const wroteCutFor = useRef<string | null>(null)
  useEffect(() => {
    if (!stopped || budget >= total || wroteCutFor.current === node.id) return
    wroteCutFor.current = node.id
    onStopTruncate(node.id, budget)
  }, [stopped, budget, total, node.id, onStopTruncate])

  return (
    <Message role="group" aria-label={ASSISTANT_NAME} className="group/turn">
      <MessageContent className="min-w-0 gap-2">
        {/* Each version carries its own model, so the reader comparing two of
            them can see which one wrote this without hovering anything. */}
        <MessageHeader className="text-muted-foreground flex-wrap gap-x-2 gap-y-1 pb-0.5 text-[13px]">
          <span className="text-foreground min-w-0 truncate font-medium">
            {modelName(node.modelId ?? "")}
          </span>
          <Dot />
          <span className="tabular-nums">{node.at}</span>
        </MessageHeader>

        {node.reasoning && !streaming ? (
          <ReasoningDisclosure reasoning={node.reasoning} />
        ) : null}

        <Bubble variant="ghost" className="w-full min-w-0">
          {/* w-full over the stock w-fit, or each artifact picks its own width
              and the column edge wobbles. Body a step above the chrome. */}
          <BubbleContent className="w-full min-w-0 space-y-3 text-[15px]/6">
            <ReplyBody
              parts={node.parts}
              budget={budget}
              streaming={streaming}
              diffAgainst={diffAgainst}
              cite={cite}
            />
          </BubbleContent>
        </Bubble>

        {sources.length > 0 && !streaming ? (
          <SourceStrip
            sources={sources}
            numbered={cited}
            activeSourceId={activeSourceId}
            onCite={setActiveSourceId}
          />
        ) : null}

        {streaming ? null : (
          <MessageFooter className="gap-0.5">
            {stopped ? (
              <span className="text-muted-foreground pe-1 text-[13px]">
                Stopped by you
              </span>
            ) : null}
            {/* The bar sits under the reply; the version rail sits above it on
                the fork marker, so the two never share a row. */}
            <ActionReveal always={newest}>
              <CopyAction
                label="Copy reply"
                text={nodeText(node)}
                toastLabel="Reply copied"
              />
              <RegenerateAction
                modelLabel={regenerateLabel}
                onRegenerate={() => onRegenerate(node.id)}
              />
              <VoteActions
                vote={vote}
                onVote={(next) => onVote(node.id, next)}
              />
            </ActionReveal>
          </MessageFooter>
        )}

        {followUps.length > 0 ? (
          <section
            aria-label="Follow ups"
            className="mt-0.5 flex w-full min-w-0 flex-col items-start gap-1.5"
          >
            <h4 className="text-muted-foreground text-[13px] font-medium">
              Follow Ups
            </h4>
            {followUps.map((text) => (
              // Outline, never tinted: a filled row here is a pixel off the
              // muted user bubble and reads as a message already sent.
              <Bubble
                key={text}
                variant="outline"
                className="max-w-full min-w-0"
              >
                <BubbleContent
                  render={
                    <button type="button" onClick={() => onFollowUp(text)} />
                  }
                  className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-2 text-start"
                >
                  {ICON_FOLLOW_UP}
                  <span className="min-w-0 truncate">{text}</span>
                </BubbleContent>
              </Bubble>
            ))}
          </section>
        ) : null}
      </MessageContent>
    </Message>
  )
}

/** Rewrites a sent turn, which forks the thread rather than replacing it. */
function EditForm({
  node,
  onCancel,
  onSubmit,
}: {
  node: ChatNodeRecord
  onCancel: () => void
  onSubmit: (text: string) => void
}) {
  const [value, setValue] = useState(() => nodeText(node))
  const box = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Autofocus alone parks the caret before the first character, so a typed
    // correction lands in front of the sentence being corrected.
    const field = box.current
    if (!field) return
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = value.trim()
    if (text) onSubmit(text)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Escape leaves the turn as it was; Enter commits, Shift+Enter breaks the
    // line, and an IME candidate window must not post the message.
    if (event.key === "Escape") {
      event.preventDefault()
      onCancel()
      return
    }
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return
    event.preventDefault()
    const text = value.trim()
    if (text) onSubmit(text)
  }

  return (
    <form onSubmit={submit} className="w-full">
      <InputGroup>
        <InputGroupTextarea
          ref={box}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Edit message"
          className="field-sizing-content max-h-40 min-h-16"
        />
        <InputGroupAddon align="block-end" className="gap-1">
          <span className="text-muted-foreground text-[11px]">
            Sends as a new version
          </span>
          <div className="ms-auto flex items-center gap-1">
            <InputGroupButton size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </InputGroupButton>
            <InputGroupButton size="sm" variant="default" type="submit">
              Send
            </InputGroupButton>
          </div>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}

function UserTurn({
  entry,
  editing,
  diffAgainst,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
}: {
  entry: PathEntry
  editing: boolean
  /** The version this one replaced on screen, for the arrival tint. */
  diffAgainst?: string
  onStartEdit: (id: string) => void
  onCancelEdit: () => void
  onSubmitEdit: (id: string, text: string) => void
}) {
  const { node } = entry
  const editButton = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)

  // Leaving the form unmounts the focused field, so focus falls to the body
  // unless the control that opened it takes it back.
  useLayoutEffect(() => {
    const active = document.activeElement
    if (wasEditing.current && !editing && (!active || active === document.body))
      editButton.current?.focus()
    wasEditing.current = editing
  }, [editing])

  if (editing) {
    return (
      <Message align="end" role="group" aria-label={VIEWER.name}>
        <MessageContent className="min-w-0">
          <EditForm
            node={node}
            onCancel={onCancelEdit}
            onSubmit={(text) => onSubmitEdit(node.id, text)}
          />
        </MessageContent>
      </Message>
    )
  }

  const total = node.parts.reduce((sum, part) => sum + partLength(part), 0)
  const attached = (node.attachedIds ?? []).flatMap((id) =>
    SOURCES[id] ? [SOURCES[id]] : []
  )

  return (
    <Message
      align="end"
      className="group/turn"
      role="group"
      aria-label={VIEWER.name}
    >
      <MessageContent className="min-w-0 items-end gap-1">
        {attached.length > 0 ? (
          // What the ask was run against, kept on the turn that made it.
          <AttachmentGroup className="max-w-[85%] justify-end gap-1.5">
            {attached.map((source) => (
              <Attachment key={source.id} size="xs" className="max-w-52">
                <AttachmentMedia
                  variant="icon"
                  className="text-muted-foreground"
                >
                  <SourceGlyph kind={source.kind} />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle className="text-[13px]">
                    {source.title}
                  </AttachmentTitle>
                </AttachmentContent>
              </Attachment>
            ))}
          </AttachmentGroup>
        ) : null}
        <Bubble variant="muted" align="end" className="max-w-[85%]">
          <BubbleContent className="space-y-2 text-[15px]/6">
            {/* A sent message is whole by definition, so it gets the full
                budget and never animates. */}
            <ReplyBody
              parts={node.parts}
              budget={total}
              diffAgainst={diffAgainst}
            />
          </BubbleContent>
        </Bubble>

        <MessageFooter className="gap-0.5">
          <ActionReveal>
            <span className="text-muted-foreground pe-1 text-xs tabular-nums">
              {node.at}
            </span>
            <CopyAction
              label="Copy message"
              text={nodeText(node)}
              toastLabel="Message copied"
            />
            <EditAction ref={editButton} onEdit={() => onStartEdit(node.id)} />
          </ActionReveal>
        </MessageFooter>
      </MessageContent>
    </Message>
  )
}

function ChatEmpty({ onStart }: { onStart: (text: string) => void }) {
  return (
    // Centred while it fits, scrollable once the starters outgrow a short
    // frame. `m-auto` centres without clipping the way justify-center does.
    <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-8">
      <div className="m-auto flex w-full max-w-xl flex-col gap-6">
        <Empty className="flex-none p-0">
          <EmptyHeader>
            <EmptyMedia className="mb-0">
              <IconStack aria-hidden="true" className="h-16 w-14">
                <GitBranchIcon strokeWidth="1.9" className="size-3.5" aria-hidden="true" />
              </IconStack>
            </EmptyMedia>
            <EmptyTitle>New Thread</EmptyTitle>
            <EmptyDescription>
              Every reply keeps its earlier versions.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <div className="flex flex-col">
          {STARTERS.map((prompt) => (
            <Button
              key={prompt}
              variant="ghost"
              onClick={() => onStart(prompt)}
              className="text-muted-foreground hover:text-foreground group/prompt border-border h-auto w-full justify-start gap-3 rounded-none border-x-0 border-t-0 border-b px-0 py-2.5 text-start text-[15px] font-normal whitespace-normal last:border-b-0 hover:bg-transparent"
            >
              <span className="min-w-0 flex-1">{prompt}</span>
              <ArrowUpIcon className="size-4 shrink-0 rotate-45 opacity-40 transition-opacity group-hover/prompt:opacity-100" aria-hidden="true" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Turns kept in view when the header folds the thread. */
const KEEP_WHEN_COLLAPSED = 2

export function ChatThread({
  path,
  separator,
  collapsed,
  streaming,
  steps,
  stepIndex,
  announced,
  arrivingId,
  stoppedIds,
  editingId,
  diff,
  regenerateLabel,
  votes,
  onVote,
  onSelectVersion,
  onStart,
  onExpand,
  onFollowUp,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onRegenerate,
  onStopTruncate,
  onRevealDone,
}: {
  /** The visible thread: one node per fork, already resolved to a version. */
  path: PathEntry[]
  /** Date label at the top of the scrollback, from the open thread. */
  separator: string
  /** True while the earlier turns are folded behind the compaction marker. */
  collapsed: boolean
  streaming: boolean
  /** The pass the run is walking, one row per step. */
  steps: ActivityStep[]
  /** How many of them have finished; the one at this index is in flight. */
  stepIndex: number
  /** The settled reply, read out once the run ends. */
  announced: string
  arrivingId: string | null
  /** Replies a Stop cut short, which must stay cut short from then on. */
  stoppedIds: string[]
  editingId: string | null
  /** The fork just switched and the text it replaced, for the arrival tint. */
  diff: { forkKey: string; oldText: string } | null
  regenerateLabel: string
  /** Ratings by turn id, so a reply keeps the one it was given. */
  votes: Record<string, Vote>
  onVote: (id: string, next: Vote | null) => void
  onSelectVersion: (forkKey: string, id: string) => void
  onStart: (text: string) => void
  /** Unfolds the earlier turns from inside the compaction marker. */
  onExpand: () => void
  onFollowUp: (text: string) => void
  onStartEdit: (id: string) => void
  onCancelEdit: () => void
  onSubmitEdit: (id: string, text: string) => void
  onRegenerate: (id: string) => void
  /** Writes what a Stop had let through back into the node. */
  onStopTruncate: (id: string, budget: number) => void
  /** The arriving reply finished typing; the run settles. */
  onRevealDone: (id: string) => void
}) {
  /** The fork position a chip press captured, replayed by ForkPin. */
  const pin = useRef<{ messageId: string; margin: number } | null>(null)

  if (path.length === 0 && !streaming) {
    return <ChatEmpty onStart={onStart} />
  }

  const hiddenCount = collapsed
    ? Math.max(0, path.length - KEEP_WHEN_COLLAPSED)
    : 0
  /** Only the newest settled reply offers follow ups: an older one would
      answer a question two turns back. */
  const newestId = path.length > 0 ? path[path.length - 1].node.id : null
  const liveStep = steps[Math.min(stepIndex, steps.length - 1)]

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        {/* The viewport's own mask dissolves the last turn into the composer.
            Native anchoring is off: it drifts the pinned fork on a swap. */}
        <MessageScrollerViewport className="scrollbar [--scroll-fade-b-size:2.5rem] [overflow-anchor:none]">
          <MessageScrollerContent
            aria-busy={streaming}
            className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-7 px-4 pt-6 pb-10 sm:px-6"
          >
            <MessageScrollerItem
              scrollAnchor={false}
              className="[content-visibility:visible]"
            >
              <Marker variant="separator">
                <MarkerContent className="text-[13px]">
                  {separator}
                </MarkerContent>
              </Marker>
            </MessageScrollerItem>

            {hiddenCount > 0 ? (
              <MessageScrollerItem
                scrollAnchor={false}
                className="[content-visibility:visible]"
              >
                <Marker variant="separator">
                  <MarkerContent className="flex items-center gap-2 text-[13px]">
                    <span>
                      <span className="tabular-nums">{hiddenCount}</span> turns
                      hidden
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onExpand}
                      className="h-6 px-2 text-xs tracking-normal normal-case"
                    >
                      Show all
                    </Button>
                  </MarkerContent>
                </Marker>
              </MessageScrollerItem>
            ) : null}

            {/* Deviation from messageId-is-the-newest-id: the id is the fork
                SLOT, so a version swap holds in place; new slots still follow. */}
            {path.map((entry, position) =>
              position < hiddenCount ? null : (
                <MessageScrollerItem
                  key={`slot-${position}`}
                  messageId={`slot-${position}`}
                  scrollAnchor={false}
                  // gap-4 inside the item against gap-7 between them, so a fork
                  // rail reads as belonging to the turn under it.
                  className="flex flex-col gap-4 [content-visibility:visible]"
                >
                  {entry.versions.length > 1 ? (
                    <BranchRail
                      entry={entry}
                      pin={pin}
                      onSelectVersion={onSelectVersion}
                    />
                  ) : null}

                  {/* Keyed by node so a version swap crossfades in place,
                      opacity only, while the rail above keeps its focus. */}
                  <div
                    key={entry.node.id}
                    className="animate-in fade-in-0 duration-300 ease-out motion-reduce:animate-none"
                  >
                    {entry.node.role === "user" ? (
                      <UserTurn
                        entry={entry}
                        editing={editingId === entry.node.id}
                        diffAgainst={
                          diff?.forkKey === entry.forkKey
                            ? diff.oldText
                            : undefined
                        }
                        onStartEdit={onStartEdit}
                        onCancelEdit={onCancelEdit}
                        onSubmitEdit={onSubmitEdit}
                      />
                    ) : (
                      <AssistantTurn
                        entry={entry}
                        newest={entry.node.id === newestId}
                        followUps={
                          entry.node.id === newestId &&
                          !streaming &&
                          !stoppedIds.includes(entry.node.id)
                            ? (entry.node.followUps ?? [])
                            : []
                        }
                        streaming={entry.node.id === arrivingId}
                        stopped={stoppedIds.includes(entry.node.id)}
                        diffAgainst={
                          diff?.forkKey === entry.forkKey
                            ? diff.oldText
                            : undefined
                        }
                        regenerateLabel={regenerateLabel}
                        vote={votes[entry.node.id] ?? null}
                        onVote={onVote}
                        onFollowUp={onFollowUp}
                        onRegenerate={onRegenerate}
                        onStopTruncate={onStopTruncate}
                        onRevealDone={onRevealDone}
                      />
                    )}
                  </div>
                </MessageScrollerItem>
              )
            )}

            {streaming && !arrivingId ? (
              <MessageScrollerItem
                scrollAnchor={false}
                className="[content-visibility:visible]"
              >
                <ActivitySteps steps={steps} index={stepIndex} />
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <ForkPin pin={pin} />

        {/* aria-busy silences the log while the reply types, so both the step
            in flight and the finished answer are announced from outside it. */}
        <p role="status" aria-live="polite" className="sr-only">
          {streaming ? (liveStep?.label ?? "") : announced}
        </p>

        <MessageScrollerButton
          variant="outline"
          size="icon-sm"
          className="bottom-4 rounded-full shadow-sm"
        />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}