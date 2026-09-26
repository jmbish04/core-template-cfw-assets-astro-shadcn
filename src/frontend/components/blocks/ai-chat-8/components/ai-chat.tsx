"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { ChatPanel } from "./chat-panel"
import {
  activityFor,
  composeReply,
  DICTATED,
  eventTitle,
  formatTime,
  MODELS,
  MODES,
  PENDING_EVENT,
  PLAN_DECLINED,
  planSettledText,
  SCHEDULE,
  THREADS,
  turnText,
  type EventRecord,
  type SlotRecord,
  type TurnRecord,
} from "./data"
import { PageBody } from "./page-body"
import { type PlanDecision } from "./plan-turn"
import { prefersReducedMotion, revealDurationMs } from "./reveal"

/** Long enough to read as thinking, short enough not to stall the demo. */
const THINK_MS = 700
/** Breathing room between the reveal finishing and the reply settling. */
const SETTLE_MS = 250
/** How long a take sits on its skeleton before the words land. */
const TRANSCRIBE_MS = 1400

/** 28rem where there is room, a share of the window where there is not, so a
    tablet keeps a usable page beside the panel. One owner for each width. */
const PANEL_WIDTH = "min(28rem, 45vw)"
const PANEL_WIDTH_WIDE = "min(40rem, 60vw)"

export function AiChat() {
  const [threadId, setThreadId] = useState(THREADS[0].id)
  const [turns, setTurns] = useState<TurnRecord[]>(THREADS[0].turns)
  const [schedule, setSchedule] = useState<EventRecord[]>(SCHEDULE)
  /** The ask nothing has booked yet; Approve is the only thing that clears it. */
  const [pendingEvent, setPendingEvent] = useState<EventRecord | null>(
    PENDING_EVENT
  )
  const [decisions, setDecisions] = useState<Record<string, PlanDecision>>({})
  /** Slot id already sent, per slots turn. */
  const [slotChoices, setSlotChoices] = useState<Record<string, string>>({})
  /** Meetings handed down from an answer, scoping the next question. */
  const [attached, setAttached] = useState<EventRecord[]>([])
  /** New chat parks the panel on its zero state until the next send. */
  const [showEmpty, setShowEmpty] = useState(false)
  const [wide, setWide] = useState(false)
  const [modelId, setModelId] = useState(MODELS[0].id)
  const [modeId, setModeId] = useState(MODES[1].id)
  /** The next answer, held back for a beat so the thinking state is on screen. */
  const [pendingReply, setPendingReply] = useState<TurnRecord | null>(null)
  /** The answer currently typing itself out. */
  const [arrivingId, setArrivingId] = useState<string | null>(null)
  const [transcribingId, setTranscribingId] = useState<string | null>(null)
  const [thinkingLabel, setThinkingLabel] = useState("Reading your calendar")
  /** Edit loads a transcript back into the composer; the serial re-loads it. */
  const [draft, setDraft] = useState<{ text: string; serial: number } | null>(
    null
  )

  /** Monotonic counters, so ids never come from inside a state updater. */
  const turnSerial = useRef(0)
  const editSerial = useRef(0)
  const replyCount = useRef(0)
  /** How many times the current ask has been retried, so Try again walks the
      alternates instead of repeating the same answer. */
  const takeCount = useRef(0)
  const dictationCount = useRef(0)
  /** The take waiting on its transcript, so the effect needs no turn lookup. */
  const dictating = useRef<string | null>(null)

  // One delivery path for every answer: a send, a chip, a redo and a voice note
  // all wait the same beat and then land.
  useEffect(() => {
    if (!pendingReply) return
    const timer = window.setTimeout(() => {
      setTurns((current) => [...current, pendingReply])
      setArrivingId(pendingReply.id)
      setPendingReply(null)
    }, THINK_MS)
    return () => window.clearTimeout(timer)
  }, [pendingReply])

  // The settle waits out the reveal's own duration, so a long answer is never
  // cut mid type; reduced motion reveals it whole and settles straight away.
  useEffect(() => {
    if (!arrivingId) return
    const arriving = turns.find((turn) => turn.id === arrivingId)
    const text = arriving?.kind === "said" ? arriving.text : ""
    const settle = prefersReducedMotion()
      ? SETTLE_MS
      : revealDurationMs(text) + SETTLE_MS
    const timer = window.setTimeout(() => setArrivingId(null), settle)
    return () => window.clearTimeout(timer)
  }, [arrivingId, turns])

  // A take transcribes, then answers itself, so the mic reaches the same
  // delivery path a typed question does.
  useEffect(() => {
    if (!transcribingId) return
    const timer = window.setTimeout(() => {
      const spoken = dictating.current
      dictating.current = null
      setTranscribingId(null)
      if (spoken) startReply(spoken)
    }, TRANSCRIBE_MS)
    return () => window.clearTimeout(timer)
  }, [transcribingId])

  /** Answers a prompt with whichever shape the library returns for it. */
  function startReply(prompt: string) {
    const serial = ++turnSerial.current
    setThinkingLabel(activityFor(prompt))
    setPendingReply({
      id: `reply_${serial}`,
      ...composeReply(prompt, replyCount.current++, takeCount.current),
    })
  }

  /** A line the panel owes the reader right now, with no thinking beat: it is
      the consequence of something they just pressed. */
  function settleWith(text: string) {
    const id = `said_${++turnSerial.current}`
    setTurns((current) => [...current, { id, kind: "said", text }])
    setArrivingId(id)
  }

  function send(text: string) {
    const serial = ++turnSerial.current
    setTurns((current) => [
      ...current,
      {
        id: `asked_${serial}`,
        kind: "asked",
        text,
        context: attached.length
          ? attached.map((event) => event.title)
          : undefined,
      },
    ])
    setShowEmpty(false)
    setAttached([])
    takeCount.current = 0
    startReply(text)
  }

  function voice(seconds: number) {
    const id = `voice_${++turnSerial.current}`
    const transcript = DICTATED[dictationCount.current++ % DICTATED.length]
    dictating.current = transcript
    setTurns((current) => [
      ...current,
      { id, kind: "voice", seconds, transcript },
    ])
    setShowEmpty(false)
    takeCount.current = 0
    setTranscribingId(id)
  }

  /** Drops whatever is in flight: a queued reply, a typing one, or a take
      still resolving to text. A cancelled take leaves no half turn behind. */
  function stop() {
    setPendingReply(null)
    setArrivingId(null)
    if (!transcribingId) return
    const cancelled = transcribingId
    dictating.current = null
    setTranscribingId(null)
    setTurns((current) => current.filter((turn) => turn.id !== cancelled))
  }

  /** Answers the question above a turn again. The rotating counter means the
      second attempt is a different shape, not the same words twice. */
  function redo(turnId: string) {
    const index = turns.findIndex((turn) => turn.id === turnId)
    if (index < 0) return
    let askIndex = index - 1
    while (askIndex >= 0) {
      const candidate = turns[askIndex]
      if (candidate.kind === "asked" || candidate.kind === "voice") break
      askIndex -= 1
    }
    const ask = turns[askIndex]
    const prompt = ask ? turnText(ask) : ""
    if (!prompt) return
    takeCount.current += 1
    setTurns(turns.slice(0, index))
    setArrivingId(null)
    startReply(prompt)
  }

  /** The only path that writes to the calendar. Everything else is a proposal. */
  function approve(turnId: string) {
    const turn = turns.find((entry) => entry.id === turnId)
    if (!turn || turn.kind !== "plan") return
    const booked =
      pendingEvent && pendingEvent.id === turn.addId ? pendingEvent : null

    setSchedule((current) => {
      const moved = current.map((event) => {
        const move = turn.moves.find((entry) => entry.eventId === event.id)
        return move
          ? { ...event, startsAt: move.startsAt, movedTo: move.day }
          : event
      })
      return booked ? [...moved, booked] : moved
    })

    const movedTitles = turn.moves
      .map((move) => eventTitle(schedule, move.eventId))
      .filter(Boolean)
    const notified: string[] = []
    for (const event of [
      ...schedule.filter((entry) =>
        turn.moves.some((move) => move.eventId === entry.id)
      ),
      ...(booked ? [booked] : []),
    ])
      for (const person of event.guests)
        if (!notified.includes(person.name)) notified.push(person.name)

    if (booked) setPendingEvent(null)
    setDecisions((current) => ({ ...current, [turnId]: "approved" }))
    settleWith(planSettledText(movedTitles, notified, booked?.title))
  }

  function decline(turnId: string) {
    const turn = turns.find((entry) => entry.id === turnId)
    if (turn?.kind === "plan" && pendingEvent && pendingEvent.id === turn.addId)
      setPendingEvent(null)
    setDecisions((current) => ({ ...current, [turnId]: "declined" }))
    settleWith(PLAN_DECLINED)
  }

  function confirmSlot(turnId: string, slot: SlotRecord) {
    setSlotChoices((current) => ({ ...current, [turnId]: slot.id }))
    const when = slot.day
      ? `${slot.day} at ${formatTime(slot.startsAt)}`
      : formatTime(slot.startsAt)
    settleWith(
      `Invite sent for ${when}. Omar has it, and I will chase a reply.`
    )
  }

  function attachEvent(id: string) {
    const event =
      schedule.find((entry) => entry.id === id) ??
      (pendingEvent?.id === id ? pendingEvent : undefined)
    if (!event) return
    setAttached((current) =>
      current.some((entry) => entry.id === id) ? current : [...current, event]
    )
  }

  function loadThread(id: string) {
    const next = THREADS.find((entry) => entry.id === id) ?? THREADS[0]
    setThreadId(next.id)
    setTurns(next.turns)
    setShowEmpty(false)
    setDecisions({})
    setSlotChoices({})
    setPendingReply(null)
    setArrivingId(null)
    setTranscribingId(null)
    setAttached([])
    setDraft(null)
    dictating.current = null
  }

  /** Clears the conversation. The calendar keeps whatever was booked, because
      a new chat is not an undo. */
  function newChat() {
    setShowEmpty(true)
    setTurns([])
    setDecisions({})
    setSlotChoices({})
    setPendingReply(null)
    setArrivingId(null)
    setTranscribingId(null)
    setPendingEvent(null)
    setAttached([])
    setDraft(null)
    dictating.current = null
  }

  return (
    // Every tooltip in the block needs this ancestor to open.
    <TooltipProvider delay={200}>
      <SidebarProvider
        className="h-svh"
        // customize: --sidebar paints the floating card; card reads as a panel
        // lifted off the page, where the sidebar token reads as chrome.
        style={
          {
            "--sidebar-width": wide ? PANEL_WIDTH_WIDE : PANEL_WIDTH,
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
          threadId={threadId}
          onThreadChange={loadThread}
          turns={turns}
          schedule={schedule}
          pendingEvent={pendingEvent}
          decisions={decisions}
          slotChoices={slotChoices}
          showEmpty={showEmpty}
          thinking={pendingReply !== null}
          thinkingLabel={thinkingLabel}
          arrivingId={arrivingId}
          transcribingId={transcribingId}
          wide={wide}
          onWideChange={setWide}
          modelId={modelId}
          onModelChange={setModelId}
          modeId={modeId}
          onModeChange={setModeId}
          draft={draft}
          attached={attached}
          onAttachEvent={attachEvent}
          onDetach={(id) =>
            setAttached((current) => current.filter((entry) => entry.id !== id))
          }
          onSend={send}
          onVoice={voice}
          onStop={stop}
          onNewChat={newChat}
          onApprove={approve}
          onDecline={decline}
          onSlotConfirm={confirmSlot}
          onRedo={redo}
          onEditVoice={(text) =>
            setDraft({ text, serial: ++editSerial.current })
          }
          onResendVoice={(text) => {
            takeCount.current = 0
            startReply(text)
          }}
        />
      </SidebarProvider>
    </TooltipProvider>
  )
}