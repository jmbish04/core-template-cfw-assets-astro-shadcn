import { useCallback, useEffect, useRef, useState } from "react"

import { ChatThread } from "./chat-thread"
import { Composer } from "./composer"
import {
  MODELS,
  PENDING_REPLIES,
  REFERENCE_TIME,
  SOURCES,
  THINKING_STEPS,
  THREADS,
  TRANSCRIPTS,
  type AssistantTurn,
  type Density,
  type TurnRecord,
} from "./data"
import { StageHeader } from "./stage-header"
import { WaveDots } from "./wave-dots"

/** How long a reply runs, and how fast the thinking line steps through it. */
const STREAM_MS = 2800
const THINK_MS = 900

const STOPPED_TEXT =
  "Stopped. The patch was drafted but never applied, so the worker is untouched."

export function AiChat() {
  const [threadId, setThreadId] = useState<string | null>(THREADS[0].id)
  const [turns, setTurns] = useState<TurnRecord[]>(TRANSCRIPTS[THREADS[0].id])
  const [draft, setDraft] = useState("")
  const [modelId, setModelId] = useState(MODELS[0].id)
  const [scopeIds, setScopeIds] = useState(SOURCES.map((source) => source.id))
  const [favorite, setFavorite] = useState(false)
  const [ratings, setRatings] = useState<Record<string, "up" | "down">>({})
  const [density, setDensity] = useState<Density>("comfortable")
  const [showRunDetails, setShowRunDetails] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [thinkingStep, setThinkingStep] = useState(0)

  const field = useRef<HTMLTextAreaElement>(null)
  // Ids must survive re-renders, so the counter lives outside render state.
  const serial = useRef(0)
  // Cycles the canned answers, so two sends in a row never read alike.
  const replyIndex = useRef(0)

  const settle = useCallback((turnId: string, next: "settled" | "stopped") => {
    setStreamingId(null)
    setThinkingStep(0)
    setTurns((current) =>
      current.map((turn) => {
        if (turn.id !== turnId || turn.role !== "assistant") return turn
        if (next === "stopped") {
          return { ...turn, state: "stopped", text: STOPPED_TEXT }
        }
        const reply =
          PENDING_REPLIES[replyIndex.current % PENDING_REPLIES.length]
        replyIndex.current += 1
        return { ...turn, state: "settled", ...reply }
      })
    )
  }, [])

  // The run's clock: the thinking line steps while the reply settles on a timer.
  useEffect(() => {
    if (!streamingId) return
    const tick = window.setInterval(
      () => setThinkingStep((step) => (step + 1) % THINKING_STEPS.length),
      THINK_MS
    )
    const timer = window.setTimeout(
      () => settle(streamingId, "settled"),
      STREAM_MS
    )
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(timer)
    }
  }, [streamingId, settle])

  function send(text: string) {
    serial.current += 1
    const replyId = `t_a${serial.current}`
    const reply: AssistantTurn = {
      id: replyId,
      role: "assistant",
      state: "streaming",
      modelId,
      at: REFERENCE_TIME,
      text: "",
    }
    setTurns((current) => [
      ...current,
      { id: `t_u${serial.current}`, role: "user", text, at: REFERENCE_TIME },
      reply,
    ])
    setStreamingId(replyId)
    setDraft("")
    field.current?.focus()
  }

  function stop() {
    if (streamingId) settle(streamingId, "stopped")
  }

  function retry(turnId: string) {
    setTurns((current) =>
      current.map((turn) =>
        turn.id === turnId && turn.role === "assistant"
          ? { ...turn, state: "streaming", modelId, text: "" }
          : turn
      )
    )
    setStreamingId(turnId)
  }

  function rate(turnId: string, next: "up" | "down") {
    setRatings((current) => {
      if (current[turnId] === next) {
        const { [turnId]: _cleared, ...rest } = current
        return rest
      }
      return { ...current, [turnId]: next }
    })
  }

  function openThread(id: string) {
    setThreadId(id)
    setTurns(TRANSCRIPTS[id] ?? [])
    setStreamingId(null)
    setRatings({})
    setDraft("")
  }

  function newThread() {
    setThreadId(null)
    setTurns([])
    setStreamingId(null)
    setRatings({})
    setDraft("")
    field.current?.focus()
  }

  function clearThread() {
    setTurns([])
    setStreamingId(null)
    setRatings({})
  }

  /** A starter fills the field so it can be edited; a follow up just runs. */
  function fillDraft(text: string) {
    setDraft(text)
    field.current?.focus()
  }

  // Follow ups belong to the newest reply, and only once it has settled.
  const thread = THREADS.find((entry) => entry.id === threadId)
  const newest = turns.findLast((turn) => turn.role === "assistant")
  const quickReplies =
    newest?.role === "assistant" && newest.state === "settled"
      ? (newest.replies ?? [])
      : []

  return (
    <section
      aria-label="Nimbus chat"
      // Frameless, so it drops into an app-shell content slot as is. The height
      // is definite: the transcript needs a real boundary to shrink into.
      className="bg-background relative isolate flex h-svh min-h-[32rem] w-full flex-col overflow-hidden"
    >
      {/* Dot field, faded out behind the transcript so text keeps its contrast. */}
      <WaveDots className="text-muted-foreground [mask-image:radial-gradient(76%_66%_at_50%_54%,black,transparent)]" />

      <StageHeader
        threadId={threadId ?? ""}
        onThreadChange={openThread}
        onNewThread={newThread}
        favorite={favorite}
        onFavoriteToggle={() => setFavorite((current) => !current)}
        streaming={streamingId !== null}
        density={density}
        onDensityChange={setDensity}
        showRunDetails={showRunDetails}
        onRunDetailsToggle={() => setShowRunDetails((current) => !current)}
        showTimestamps={showTimestamps}
        onTimestampsToggle={() => setShowTimestamps((current) => !current)}
        onClear={clearThread}
      />

      <ChatThread
        turns={turns}
        streaming={streamingId !== null}
        thinking={THINKING_STEPS[thinkingStep]}
        dateLabel={thread?.dateLabel ?? "Today"}
        density={density}
        showRunDetails={showRunDetails}
        showTimestamps={showTimestamps}
        ratings={ratings}
        quickReplies={quickReplies}
        onRate={rate}
        onRetry={retry}
        onQuickReply={send}
        onStarter={fillDraft}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-2 px-4 pb-4 sm:px-6 sm:pb-6">
        <Composer
          value={draft}
          onValueChange={setDraft}
          fieldRef={field}
          modelId={modelId}
          onModelChange={setModelId}
          scopeIds={scopeIds}
          onScopeChange={setScopeIds}
          streaming={streamingId !== null}
          onSend={send}
          onStop={stop}
        />
        <p className="text-muted-foreground text-center text-xs">
          Nimbus can be wrong. Check the run trace before you ship.
        </p>
      </div>
    </section>
  )
}