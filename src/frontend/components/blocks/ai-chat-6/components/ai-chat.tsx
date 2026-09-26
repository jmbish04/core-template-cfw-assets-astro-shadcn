import { useEffect, useRef, useState, type CSSProperties } from "react"
import { toast } from "sonner"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import type { AgentActions, PlanRun } from "./agent"
import type { BriefAnswers } from "./brief-card"
import { ChatPanel } from "./chat-panel"
import { copyText } from "./chat-thread"
import {
  ALL_STEP_IDS,
  branchesFor,
  clockAt,
  CREATED_REPLY,
  DEFAULT_CONTEXT_IDS,
  DEPTH_STEPS,
  draftReply,
  DUE_OPTIONS,
  FINDINGS_REPLY,
  fixReplyFor,
  FORK_REPLY,
  MODELS,
  OPENING_TURN,
  OWNERS,
  PLAN_STEPS,
  SCOPE_REPLY,
  STARTERS,
  STOPPED_NOTE,
  TASK_ID,
  TASK_LINK,
  type ArtifactRecord,
  type ChatMessageRecord,
  type FileRecord,
} from "./data"
import { PageBody } from "./page-body"
import { prefersReducedMotion, revealDurationMs } from "./reveal"

/** Long enough to read as thinking, short enough not to stall the demo. */
const THINK_MS = 900
/** Breathing room between the reveal finishing and the reply settling. */
const SETTLE_MS = 250

/** 28rem where there is room, a share of the window where there is not, so a
    tablet keeps a usable page beside the panel. One owner for the width. */
const PANEL_WIDTH = "min(28rem, 45vw)"

/** The answers that carry the task. Retrying one restores it rather than
    drafting over it, so a Stop never strands the thread without its control. */
const SCRIPTED = [SCOPE_REPLY, FINDINGS_REPLY, FORK_REPLY, CREATED_REPLY]

/** The last scripted turn sits at this offset, so a typed turn counts on. */
const FIRST_FREE_OFFSET = 8

export function AiChat() {
  /** New chat parks the panel on its zero state until the next send. */
  const [showEmpty, setShowEmpty] = useState(false)
  const [messages, setMessages] = useState<ChatMessageRecord[]>([OPENING_TURN])
  /** Answers waiting to be delivered, oldest first. A queue rather than a slot
      because a card can raise an answer while a typed one is still waiting. */
  const [queued, setQueued] = useState<ChatMessageRecord[]>([SCOPE_REPLY])
  /** The answer currently typing itself out. */
  const [arrivingId, setArrivingId] = useState<string | null>(null)
  /** Answers cut short, so their note survives the reveal ending. */
  const [stoppedIds, setStoppedIds] = useState<string[]>([])
  /** Text Edit loads back into the composer; the serial forces a re-load. */
  const [draft, setDraft] = useState<{ text: string; serial: number } | null>(
    null
  )
  const [modelId, setModelId] = useState(MODELS[0].id)

  // The task the answers act on. One owner, so the cards, the composer and the
  // header can never disagree about what the agent is working from.
  const [contextIds, setContextIds] = useState<string[]>(DEFAULT_CONTEXT_IDS)
  /** The agreed brief. Null while the agent is still asking for it. */
  const [brief, setBrief] = useState<BriefAnswers | null>(null)
  const [stepIds, setStepIds] = useState<string[]>(ALL_STEP_IDS)
  const [planRun, setPlanRun] = useState<PlanRun>("idle")
  const [doneIds, setDoneIds] = useState<string[]>([])
  const [skippedIds, setSkippedIds] = useState<string[]>([])
  const [retriedIds, setRetriedIds] = useState<string[]>([])
  const [failedId, setFailedId] = useState<string | null>(null)
  const [forkValue, setForkValue] = useState<string | null>(null)
  const [droppedCount, setDroppedCount] = useState(0)
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [ownerId, setOwnerId] = useState(OWNERS[0].id)
  const [dueId, setDueId] = useState(DUE_OPTIONS[0].id)
  const [taskCreated, setTaskCreated] = useState(false)

  /** Monotonic counters, so ids never come from inside a state updater. */
  const turnSerial = useRef(0)
  const editSerial = useRef(0)
  const clockOffset = useRef(FIRST_FREE_OFFSET)
  /** What the arriving answer has on screen, so a Stop settles exactly that. */
  const liveShown = useRef<string | null>(null)
  /** The answer a Stop cancelled before it arrived, keyed to the note that
      replaced it, so that note's Retry brings the same answer back. */
  const cancelled = useRef<{
    noteId: string
    message: ChatMessageRecord
  } | null>(null)
  /** True once the question has been put to the reader, so resuming a paused
      run does not deliver it a second time. */
  const askedFork = useRef(false)

  const activeModel = MODELS.find((m) => m.id === modelId) ?? MODELS[0]

  function enqueue(message: ChatMessageRecord) {
    setQueued((current) =>
      current.some((entry) => entry.id === message.id)
        ? current
        : [...current, message]
    )
  }

  const runQueue = PLAN_STEPS.filter((step) => stepIds.includes(step.id))
  const settledCount = runQueue.filter(
    (step) => doneIds.includes(step.id) || skippedIds.includes(step.id)
  ).length

  // One delivery path for every answer: the seeded one, a send, a retry and
  // every answer a card triggers all wait the same beat and then type.
  useEffect(() => {
    const next = queued[0]
    if (!next) return
    const timer = window.setTimeout(() => {
      setMessages((current) =>
        current.some((message) => message.id === next.id)
          ? current
          : [...current, next]
      )
      setArrivingId(next.id)
      setQueued((current) => current.slice(1))
    }, THINK_MS)
    return () => window.clearTimeout(timer)
  }, [queued])

  // The settle waits out the reveal's own duration, so a long answer is never
  // cut mid type; reduced motion reveals it whole and settles straight away.
  useEffect(() => {
    if (!arrivingId) return
    const arriving = messages.find((message) => message.id === arrivingId)
    if (!arriving) return
    const settle = prefersReducedMotion()
      ? SETTLE_MS
      : revealDurationMs(arriving.text) + SETTLE_MS
    const timer = window.setTimeout(() => {
      setArrivingId(null)
      liveShown.current = null
    }, settle)
    return () => window.clearTimeout(timer)
  }, [arrivingId, messages])

  // The plan runs one step at a time so a Stop, a failure and the agent's own
  // question can each land between two of them.
  useEffect(() => {
    if (planRun !== "running") return
    const next = PLAN_STEPS.find(
      (step) =>
        stepIds.includes(step.id) &&
        !doneIds.includes(step.id) &&
        !skippedIds.includes(step.id)
    )
    if (!next) {
      setPlanRun("done")
      enqueue(fixReplyFor(forkValue))
      return
    }
    // A branch step cannot run until the reader has picked a branch, so the
    // question gates the work rather than being raised once and forgotten.
    if (next.branch && !forkValue) {
      setPlanRun("paused")
      if (!askedFork.current) {
        askedFork.current = true
        enqueue(FORK_REPLY)
      }
      return
    }
    const timer = window.setTimeout(() => {
      // A step fails once. Retrying marks it and the second attempt lands.
      if (next.failure && !retriedIds.includes(next.id)) {
        setFailedId(next.id)
        setPlanRun("failed")
        return
      }
      setDoneIds((current) => [...current, next.id])
      if (next.artifact) {
        const made = next.artifact
        setArtifacts((current) =>
          current.some((item) => item.id === made.id)
            ? current
            : [...current, made]
        )
      }
    }, next.runMs)
    return () => window.clearTimeout(timer)
  }, [planRun, stepIds, doneIds, skippedIds, retriedIds, forkValue])

  /** The one send path: the composer, a starter and a quick reply all land
      here, so every turn is committed the same way. */
  function send(text: string) {
    const serial = ++turnSerial.current
    const at = clockAt(clockOffset.current++)
    const sent = files
    setMessages((current) => [
      ...current,
      {
        id: `sent_${serial}`,
        role: "user",
        at,
        text,
        fileIds: sent.length ? sent.map((file) => file.id) : undefined,
      },
    ])
    enqueue({
      id: `reply_${serial}`,
      role: "assistant",
      at: clockAt(clockOffset.current++),
      ...draftReply(text, serial, contextIds.length, activeModel.name),
    })
    setFiles([])
    setShowEmpty(false)
  }

  /** Keeps only the text that had arrived and marks that answer as stopped. */
  function stop() {
    const pending = queued[0]
    if (pending) {
      // Nothing had arrived, so the thread says why rather than trailing off.
      const serial = ++turnSerial.current
      const noteId = `stopped_${serial}`
      // Cutting the question off would strand a paused run with nothing to
      // answer, so the gate reopens and Resume can put it back.
      if (pending.id === FORK_REPLY.id) {
        askedFork.current = false
        setPlanRun("idle")
      }
      cancelled.current = { noteId, message: pending }
      setQueued((current) => current.slice(1))
      setMessages((current) => [
        ...current,
        {
          id: noteId,
          role: "assistant",
          at: clockAt(clockOffset.current++),
          ...STOPPED_NOTE,
        },
      ])
      return
    }
    if (!arrivingId) return
    const id = arrivingId
    const shown = liveShown.current
    liveShown.current = null
    setArrivingId(null)
    setStoppedIds((ids) => (ids.includes(id) ? ids : [...ids, id]))
    if (shown)
      setMessages((current) =>
        current.map((message) =>
          message.id === id ? { ...message, text: shown } : message
        )
      )
  }

  function retry(prompt: string, replyId: string) {
    setMessages((current) => current.filter((m) => m.id !== replyId))
    setStoppedIds((ids) => ids.filter((id) => id !== replyId))
    setArrivingId(null)
    const restored =
      SCRIPTED.find((message) => message.id === replyId) ??
      (cancelled.current?.noteId === replyId
        ? cancelled.current.message
        : undefined)
    if (restored) {
      cancelled.current = null
      enqueue(restored)
      return
    }
    const serial = ++turnSerial.current
    enqueue({
      id: `reply_${serial}`,
      role: "assistant",
      at: clockAt(clockOffset.current++),
      ...draftReply(prompt, serial, contextIds.length, activeModel.name),
    })
  }

  function newChat() {
    setShowEmpty(true)
    setMessages([])
    setQueued([])
    setArrivingId(null)
    setStoppedIds([])
    cancelled.current = null
    clockOffset.current = FIRST_FREE_OFFSET
    setContextIds(DEFAULT_CONTEXT_IDS)
    setBrief(null)
    setStepIds(ALL_STEP_IDS)
    setPlanRun("idle")
    setDoneIds([])
    setSkippedIds([])
    setRetriedIds([])
    setFailedId(null)
    setForkValue(null)
    setDroppedCount(0)
    setArtifacts([])
    setFiles([])
    setTaskCreated(false)
    askedFork.current = false
  }

  // Changing what the agent reads invalidates everything derived from the old
  // set, so the thread rewinds to the turn that asked and runs again.
  function rewind() {
    setBrief(null)
    setQueued([])
    setArrivingId(null)
    setPlanRun("idle")
    setDoneIds([])
    setSkippedIds([])
    setRetriedIds([])
    setFailedId(null)
    setForkValue(null)
    setDroppedCount(0)
    setArtifacts([])
    setStepIds(ALL_STEP_IDS)
    setStoppedIds([])
    setTaskCreated(false)
    askedFork.current = false
    cancelled.current = null
    clockOffset.current = FIRST_FREE_OFFSET
    setMessages((current) => {
      const cut = current.findIndex((message) => message.id === SCOPE_REPLY.id)
      return cut === -1 ? current : current.slice(0, cut + 1)
    })
  }

  const actions: AgentActions = {
    onSourceToggle: (id, on) => {
      setContextIds((current) =>
        on
          ? current.includes(id)
            ? current
            : [...current, id]
          : current.filter((entry) => entry !== id)
      )
      if (brief) rewind()
    },
    // Each answer lands somewhere: the sources become the context, the depth
    // pre-selects the plan, and the deadline sets the ticket's due date.
    onBriefSubmit: (answers) => {
      setBrief(answers)
      setContextIds(answers.sources)
      setStepIds(DEPTH_STEPS[answers.depth] ?? ALL_STEP_IDS)
      if (answers.deadline) setDueId(answers.deadline)
      enqueue(FINDINGS_REPLY)
    },
    onBriefReopen: rewind,
    onStepToggle: (id, on) =>
      setStepIds((current) =>
        // Rebuilt from the canonical order, so a step switched back on returns
        // to its place in the plan rather than to the end of it.
        on
          ? ALL_STEP_IDS.filter(
              (entry) => entry === id || current.includes(entry)
            )
          : current.filter((entry) => entry !== id)
      ),
    onPlanRun: () => setPlanRun("running"),
    onPlanStop: () => setPlanRun("idle"),
    onPlanRetry: () => {
      if (failedId) setRetriedIds((current) => [...current, failedId])
      setFailedId(null)
      setPlanRun("running")
    },
    onPlanSkip: () => {
      if (failedId) setSkippedIds((current) => [...current, failedId])
      setFailedId(null)
      setPlanRun("running")
    },
    onForkAnswer: (value) => {
      setForkValue(value)
      // The branch the reader did not take is switched off, so the plan shows
      // the decision rather than only describing it.
      const keeps = branchesFor(value)
      setStepIds((current) => {
        const kept = current.filter((id) => {
          const step = PLAN_STEPS.find((entry) => entry.id === id)
          return !step?.branch || keeps.includes(step.branch)
        })
        setDroppedCount(current.length - kept.length)
        return kept
      })
      setPlanRun("running")
    },
    onFileAdd: (file) =>
      setFiles((current) =>
        current.some((item) => item.id === file.id)
          ? current
          : [...current, file]
      ),
    onFileRemove: (id) =>
      setFiles((current) => current.filter((file) => file.id !== id)),
    onOwnerChange: setOwnerId,
    onDueChange: setDueId,
    onTaskCreate: () => {
      setTaskCreated(true)
      enqueue(CREATED_REPLY)
    },
    onTaskCopyLink: () =>
      copyText(TASK_LINK, (ok) =>
        ok ? toast.success(`Copied ${TASK_ID}`) : toast.error("Copy blocked")
      ),
    onArtifactDownload: (name) => toast.success(`Downloading ${name}`),
  }

  const thinkingLabel = brief
    ? `Reading ${contextIds.length} ${contextIds.length === 1 ? "source" : "sources"}`
    : "Checking the workspace"

  const status =
    planRun === "running"
      ? {
          text: `Step ${Math.min(settledCount + 1, runQueue.length)} of ${runQueue.length}`,
          tone: "run" as const,
        }
      : planRun === "failed"
        ? { text: "Step failed", tone: "attention" as const }
        : planRun === "paused"
          ? { text: "Waiting on you", tone: "attention" as const }
          : queued.length
            ? { text: "Thinking", tone: "wait" as const }
            : arrivingId
              ? { text: "Writing", tone: "wait" as const }
              : null

  return (
    // Every tooltip in the block needs this ancestor to open.
    <TooltipProvider delay={200}>
      <SidebarProvider
        className="h-svh"
        // customize: --sidebar paints the floating card; card reads as a panel
        // lifted off the page, where the sidebar token reads as chrome.
        style={
          {
            "--sidebar-width": PANEL_WIDTH,
            "--sidebar": "var(--card)",
          } as CSSProperties
        }
      >
        {/* The inset comes first: the panel's flow gap is what pushes the page,
            and a gap placed before the inset would reserve the wrong side. */}
        <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
          <PageBody />
        </SidebarInset>

        <ChatPanel
          messages={messages}
          thinking={queued.length > 0}
          thinkingLabel={thinkingLabel}
          status={status?.text ?? null}
          statusIsRun={status?.tone === "run"}
          statusSpins={status?.tone !== "attention"}
          arrivingId={arrivingId}
          stoppedIds={stoppedIds}
          showEmpty={showEmpty}
          agent={{
            contextIds,
            brief,
            stepIds,
            planRun,
            doneIds,
            skippedIds,
            failedId,
            forkValue,
            droppedCount,
            artifacts,
            files,
            ownerId,
            dueId,
            taskCreated,
          }}
          actions={actions}
          modelId={modelId}
          onModelChange={setModelId}
          starters={showEmpty ? STARTERS : []}
          draft={draft}
          onSend={send}
          onStop={stop}
          onRetry={retry}
          onEdit={(text) => setDraft({ text, serial: ++editSerial.current })}
          onShown={(text) => {
            liveShown.current = text
          }}
          onCopy={(text) =>
            copyText(text, (ok) =>
              ok ? toast.success("Copied") : toast.error("Copy blocked")
            )
          }
          onNewChat={newChat}
        />
      </SidebarProvider>
    </TooltipProvider>
  )
}