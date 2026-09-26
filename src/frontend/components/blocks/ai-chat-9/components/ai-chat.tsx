import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { TooltipProvider } from "@/components/ui/tooltip"

import { ChatThread } from "./chat-thread"
import { Composer } from "./composer"
import {
  composeReply,
  DEFAULT_MODEL_ID,
  MODELS,
  NEW_THREAD_ID,
  nodeText,
  OPENER_THREAD_ID,
  ROOT_KEY,
  spokenText,
  stepsFor,
  THREAD_TREES,
  THREAD_URL,
  THREADS,
  type ActivityStep,
  type ChatNodeRecord,
  type MessagePart,
  type ThreadTree,
} from "./data"
import { partLength, truncatePart } from "./message-parts"
import { ThreadHeader } from "./thread-header"
import { buildPath, pathTail, standingPrompt } from "./thread-tree"
import { type Vote } from "./turn-actions"

/** How long each step on the activity stack holds. The last one hands over
    to the reply, so a three step pass reads as work rather than as a wait. */
const STEP_MS = 460
/** How long the arrival tint holds before it clears on its own. */
const DIFF_MS = 2400
/** Below this many turns there is nothing worth folding, so no control. */
const COLLAPSIBLE_AT = 4

/** Up to the first sentence end, so a stopped stub still reads as prose. */
function firstSentence(text: string) {
  const match = text.match(/^[\s\S]*?[.?!](?=\s|$)/)
  return match ? match[0] : text
}

/** The threads the header star opens with. */
const INITIAL_FAVORITES: Record<string, boolean> = Object.fromEntries(
  THREADS.filter((thread) => thread.pinned).map((thread) => [thread.id, true])
)

export function AiChat() {
  /** One tree per thread. A version is a sibling in here, never an overwrite. */
  const [trees, setTrees] = useState<Record<string, ThreadTree>>(THREAD_TREES)
  const [activeThreadId, setActiveThreadId] = useState(OPENER_THREAD_ID)
  /** Favourite per thread, which also files it under Pinned in the switcher. */
  const [favorites, setFavorites] =
    useState<Record<string, boolean>>(INITIAL_FAVORITES)
  /** True while the earlier turns are folded behind the compaction marker. */
  const [collapsed, setCollapsed] = useState(false)
  /** The model the composer sends with, and the one a Regenerate writes on. */
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID)
  const [streaming, setStreaming] = useState(false)
  /** The pass the run in flight is walking, and how far through it is. */
  const [steps, setSteps] = useState<ActivityStep[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  /** The reply currently typing itself out, so only it animates. */
  const [arrivingId, setArrivingId] = useState<string | null>(null)
  /** Replies a Stop cut short, which must stay cut short from then on. */
  const [stoppedIds, setStoppedIds] = useState<string[]>([])
  /** Ratings by turn id. Held here so a version or thread switch keeps them. */
  const [votes, setVotes] = useState<Record<string, Vote>>({})
  /** The settled reply, announced once. The transcript log is aria-busy while
      it types, so without this the answer itself is never read out. */
  const [announced, setAnnounced] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  /** The fork just switched plus the text it replaced, for the arrival tint. */
  const [diff, setDiff] = useState<{ forkKey: string; oldText: string } | null>(
    null
  )

  const stepTimer = useRef<number | null>(null)
  /** Mirrors arrivingId. A Stop can land before the state commit that set it,
      and the branch it takes decides whether a stub is written. */
  const arriving = useRef<string | null>(null)
  const diffTimer = useRef<number | null>(null)
  const idCount = useRef(0)
  /** Rotates the generated draft so a second regenerate never repeats one. */
  const turnCount = useRef(0)
  /** The run in flight, so a Stop before it lands still leaves a stub. It
      carries its thread: a switch mid run settles it where it was asked. */
  const queued = useRef<{
    threadId: string
    parentId: string | null
    prompt: string
    modelId: string
  } | null>(null)

  useEffect(() => {
    return () => {
      if (stepTimer.current) window.clearInterval(stepTimer.current)
      if (diffTimer.current) window.clearTimeout(diffTimer.current)
    }
  }, [])

  const tree = trees[activeThreadId] ?? trees[NEW_THREAD_ID]
  const path = buildPath(tree.nodes, tree.rootIds, tree.selection)
  const activeModel = MODELS.find((model) => model.id === modelId) ?? MODELS[0]
  const activeThread = THREADS.find((thread) => thread.id === activeThreadId)
  const title = activeThread?.title ?? "New chat"
  /** The step on the stack right now, which is what the header reports. */
  const liveStep = steps[Math.min(stepIndex, steps.length - 1)]

  /** Both at once: the ref is read on the same tick, the state renders. */
  function setArriving(next: string | null) {
    arriving.current = next
    setArrivingId(next)
  }

  function nextId() {
    idCount.current += 1
    return `n_${idCount.current}`
  }

  function clearDiff() {
    if (diffTimer.current) window.clearTimeout(diffTimer.current)
    diffTimer.current = null
    setDiff(null)
  }

  /** Hangs a turn off its parent and shows it, which is what a fork is. */
  function appendNode(
    threadId: string,
    parentId: string | null,
    node: ChatNodeRecord
  ) {
    setTrees((current) => {
      const target = current[threadId]
      if (!target) return current
      if (parentId && !target.nodes[parentId]) return current
      const nodes = { ...target.nodes, [node.id]: node }
      if (parentId) {
        nodes[parentId] = {
          ...target.nodes[parentId],
          children: [...target.nodes[parentId].children, node.id],
        }
      }
      return {
        ...current,
        [threadId]: {
          ...target,
          nodes,
          rootIds: parentId ? target.rootIds : [...target.rootIds, node.id],
          selection: { ...target.selection, [parentId ?? ROOT_KEY]: node.id },
        },
      }
    })
  }

  function stopSteps() {
    if (stepTimer.current) window.clearInterval(stepTimer.current)
    stepTimer.current = null
  }

  /** Turns the run in flight into a reply hung off the turn that asked for it.
      `typing` decides whether it types itself out or simply lands whole. */
  function commitQueuedRun(typing: boolean) {
    const run = queued.current
    if (!run) return
    queued.current = null
    const id = nextId()
    const reply = composeReply(run.prompt, run.modelId, turnCount.current)
    turnCount.current += 1
    appendNode(run.threadId, run.parentId, {
      id,
      role: "assistant",
      at: "Now",
      modelId: run.modelId,
      parts: reply.parts,
      followUps: reply.followUps,
      reasoning: reply.reasoning,
      sources: reply.sources,
      children: [],
    })
    if (typing) setArriving(id)
  }

  /** The activity stack walks its steps, then the reply types itself out. */
  function beginReply(
    parentId: string | null,
    prompt: string,
    withModelId: string
  ) {
    const threadId = activeThreadId
    stopSteps()
    // A run still on its stack lands whole, so starting the next one never
    // leaves the turn that asked for it without a reply.
    commitQueuedRun(false)
    // A reply still typing settles whole, and never reads as streaming
    // through the new run's activity phase.
    setArriving(null)
    clearDiff()
    queued.current = { threadId, parentId, prompt, modelId: withModelId }
    setAnnounced("")
    const plan = stepsFor(prompt)
    setSteps(plan)
    setStepIndex(0)
    setStreaming(true)
    let at = 0
    stepTimer.current = window.setInterval(() => {
      at += 1
      if (at < plan.length) {
        setStepIndex(at)
        return
      }
      stopSteps()
      commitQueuedRun(true)
    }, STEP_MS)
  }

  function handleSend(text: string, attachedIds?: string[]) {
    setEditingId(null)
    // A send belongs at the end of the thread, so it also unfolds it.
    setCollapsed(false)
    const tail = pathTail(path)
    const id = nextId()
    appendNode(activeThreadId, tail?.id ?? null, {
      id,
      role: "user",
      at: "Now",
      attachedIds: attachedIds?.length ? attachedIds : undefined,
      parts: [{ kind: "text", text }],
      children: [],
    })
    beginReply(id, text, modelId)
  }

  /** The arriving reply finished typing on screen, so the run settles. */
  function handleRevealDone(id: string) {
    if (arriving.current !== id) return
    setArriving(null)
    setStreaming(false)
    const settled = trees[activeThreadId]?.nodes[id]
    if (settled) setAnnounced(spokenText(settled))
  }

  /** Keeps what the reader had already seen, and nothing after it. */
  function handleStop() {
    stopSteps()
    const typing = arriving.current
    if (typing) {
      setStoppedIds((ids) => [...ids, typing])
      setArriving(null)
      setStreaming(false)
      return
    }
    const run = queued.current
    queued.current = null
    if (run) {
      const id = nextId()
      const reply = composeReply(run.prompt, run.modelId, turnCount.current)
      turnCount.current += 1
      // A stop this early keeps the reply's first sentence, so the stub reads
      // as cut short rather than as a rendering bug.
      const first = reply.parts[0]
      const stub =
        first.kind === "text"
          ? { ...first, text: firstSentence(first.text) }
          : first
      appendNode(run.threadId, run.parentId, {
        id,
        role: "assistant",
        at: "Now",
        modelId: run.modelId,
        // A stopped reply never earned its follow ups, and it cites nothing
        // because the reader never saw what it read.
        parts: [stub],
        children: [],
      })
      setStoppedIds((ids) => [...ids, id])
    }
    setStreaming(false)
  }

  /** Writes what a Stop had let through into the node, so no remount of the
      turn can ever hand back the unseen rest of the reply. */
  function handleStopTruncate(id: string, budget: number) {
    setTrees((current) => {
      const target = current[activeThreadId]
      const node = target?.nodes[id]
      if (!target || !node) return current
      const parts: MessagePart[] = []
      let remaining = budget
      for (const part of node.parts) {
        if (remaining <= 0) break
        const length = partLength(part)
        if (length <= remaining) {
          parts.push(part)
          remaining -= length
          continue
        }
        const cut = truncatePart(part, remaining)
        // A cut that came back empty would render as a bare bullet or an
        // empty paragraph, so it is dropped rather than kept.
        if (partLength(cut) > 0 || cut.kind === "heading") parts.push(cut)
        remaining = 0
      }
      // A budget too small for even the first part still leaves a stub.
      if (parts.length === 0) {
        const first = node.parts[0]
        parts.push(
          first.kind === "text"
            ? { ...first, text: firstSentence(first.text) }
            : first
        )
      }
      // A rebuild that changed nothing must not hand back a new object: the
      // effect that asked for it would re-fire on the render it caused.
      if (
        parts.length === node.parts.length &&
        parts.every((part, index) => part === node.parts[index])
      )
        return current
      return {
        ...current,
        [activeThreadId]: {
          ...target,
          nodes: { ...target.nodes, [id]: { ...node, parts } },
        },
      }
    })
  }

  /** Switches a fork to another version and marks what changed: sentences
      absent from the outgoing version tint briefly on arrival. */
  function handleSelectVersion(forkKey: string, next: string) {
    setEditingId(null)
    const entry = path.find((item) => item.forkKey === forkKey)
    if (entry && entry.node.id !== next) {
      if (diffTimer.current) window.clearTimeout(diffTimer.current)
      setDiff({ forkKey, oldText: nodeText(entry.node) })
      // Reduced motion keeps the tint static until the next step; otherwise
      // it clears on its own once the reader has seen it.
      diffTimer.current = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? null
        : window.setTimeout(() => {
            diffTimer.current = null
            setDiff(null)
          }, DIFF_MS)
    }
    setTrees((current) => {
      const target = current[activeThreadId]
      if (!target) return current
      return {
        ...current,
        [activeThreadId]: {
          ...target,
          selection: { ...target.selection, [forkKey]: next },
        },
      }
    })
  }

  /** Answers the standing question again, as a sibling of the visible reply. */
  function handleRegenerate(id: string) {
    const entry = path.find((item) => item.node.id === id)
    if (!entry) return
    const asked = standingPrompt(path, id)
    if (!asked) return
    beginReply(
      entry.forkKey === ROOT_KEY ? null : entry.forkKey,
      nodeText(asked),
      modelId
    )
  }

  /** An edit forks the thread: the original stays, reachable from the rail. */
  function handleSubmitEdit(id: string, text: string) {
    const entry = path.find((item) => item.node.id === id)
    if (!entry) return
    setEditingId(null)
    const parentId = entry.forkKey === ROOT_KEY ? null : entry.forkKey
    const editedId = nextId()
    appendNode(activeThreadId, parentId, {
      id: editedId,
      role: "user",
      at: "Now",
      edited: true,
      attachedIds: entry.node.attachedIds,
      parts: [{ kind: "text", text }],
      children: [],
    })
    beginReply(editedId, text, modelId)
  }

  /** Leaves the run in flight where it was asked, and clears the per run
      state that belongs to the thread being left. */
  function leaveThread() {
    stopSteps()
    commitQueuedRun(false)
    clearDiff()
    setArriving(null)
    setEditingId(null)
    setStreaming(false)
    setCollapsed(false)
    setAnnounced("")
  }

  function handleSelectThread(id: string) {
    if (id === activeThreadId) return
    leaveThread()
    setActiveThreadId(id)
  }

  function handleNewChat() {
    leaveThread()
    queued.current = null
    // Only the draft thread resets, so only its own stopped replies drop.
    setStoppedIds((ids) => {
      const dropped = trees[NEW_THREAD_ID]?.nodes ?? {}
      return ids.filter((id) => !(id in dropped))
    })
    // The draft thread starts empty every time, so the starter view is never
    // lost behind a turn left there by an earlier visit.
    setTrees((current) => ({
      ...current,
      [NEW_THREAD_ID]: THREAD_TREES[NEW_THREAD_ID],
    }))
    setActiveThreadId(NEW_THREAD_ID)
  }

  /** Records or clears a rating on one turn. */
  function handleVote(id: string, next: Vote | null) {
    setVotes((current) => {
      if (!next) {
        const { [id]: _removed, ...rest } = current
        return rest
      }
      return { ...current, [id]: next }
    })
  }

  function handleCopyLink() {
    navigator.clipboard
      ?.writeText(`${THREAD_URL}${activeThreadId}`)
      .then(() => toast("Link copied"))
      .catch(() => toast.error("Copy failed"))
  }

  /** Hands over exactly the version of the thread that is on screen. */
  function handleCopyTranscript() {
    const text = path
      .map((entry) => nodeText(entry.node))
      .join("\n\n")
      .trim()
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast("Transcript copied"))
      .catch(() => toast.error("Copy failed"))
  }

  return (
    // Every tooltip in the block needs this ancestor to open. The delay keeps
    // the action bar quiet while the pointer crosses it.
    <TooltipProvider delay={500} closeDelay={0}>
      <div className="bg-background text-foreground flex h-svh w-full flex-col">
        <ThreadHeader
          title={title}
          threads={THREADS}
          favorites={favorites}
          activeThreadId={activeThreadId}
          streaming={streaming}
          activityLabel={liveStep?.label ?? ""}
          collapsed={collapsed}
          canCollapse={path.length >= COLLAPSIBLE_AT}
          onSelectThread={handleSelectThread}
          onNewChat={handleNewChat}
          onToggleFavorite={() =>
            setFavorites((current) => ({
              ...current,
              [activeThreadId]: !current[activeThreadId],
            }))
          }
          onToggleCollapsed={() => setCollapsed((current) => !current)}
          onCopyLink={handleCopyLink}
          onCopyTranscript={handleCopyTranscript}
        />

        <ChatThread
          path={path}
          separator={tree.separator}
          collapsed={collapsed}
          streaming={streaming}
          steps={steps}
          stepIndex={stepIndex}
          announced={announced}
          arrivingId={arrivingId}
          stoppedIds={stoppedIds}
          editingId={editingId}
          diff={diff}
          regenerateLabel={activeModel.name}
          votes={votes}
          onVote={handleVote}
          onSelectVersion={handleSelectVersion}
          onStart={handleSend}
          onExpand={() => setCollapsed(false)}
          onFollowUp={handleSend}
          onStartEdit={setEditingId}
          onCancelEdit={() => setEditingId(null)}
          onSubmitEdit={handleSubmitEdit}
          onRegenerate={handleRegenerate}
          onStopTruncate={handleStopTruncate}
          onRevealDone={handleRevealDone}
        />

        <Composer
          streaming={streaming}
          modelId={modelId}
          onModelChange={setModelId}
          onSend={handleSend}
          onStop={handleStop}
        />
      </div>
    </TooltipProvider>
  )
}