import { useEffect, useRef, useState, type CSSProperties } from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { type Vote } from "./answer-parts"
import { AskPanel } from "./ask-panel"
import {
  composeReply,
  OPENING_TURNS,
  ticketOpenedText,
  type ReplyBody,
  type TurnRecord,
} from "./data"
import { DocsPage } from "./docs-page"
import { type RetrievalPhase } from "./retrieval-trace"
import { prefersReducedMotion, revealDurationMs } from "./reveal"

/** How long the search runs before it has titles to show. */
const SEARCH_MS = 550
/** Time on each article. Long enough to read as work, short enough to watch. */
const READ_MS = 230
/** The pause between the last article and the first word of the answer. */
const WRITE_MS = 400
/** Breathing room between the reveal finishing and the answer settling. */
const SETTLE_MS = 250

/** 26rem where there is room, a share of the window where there is not, so a
    tablet keeps a readable page beside the panel. One owner for each width. */
const PANEL_WIDTH = "min(26rem, 42vw)"

/** A reply on its way: what it will say, and how far the reading has got. */
type Retrieval = {
  id: string
  phase: RetrievalPhase
  matched: string[]
  readCount: number
  reply: ReplyBody
}

/** The part of a turn that types itself out. */
function leadText(turn: TurnRecord) {
  if (turn.kind === "asked" || turn.kind === "said") return turn.text
  return turn.lead
}

export function AiChat() {
  const [turns, setTurns] = useState<TurnRecord[]>(OPENING_TURNS)
  /** New question parks the panel on its zero state until the next send. */
  const [showEmpty, setShowEmpty] = useState(false)
  const [showSteps, setShowSteps] = useState(true)
  const [votes, setVotes] = useState<Record<string, Vote>>({})
  const [contacted, setContacted] = useState<Record<string, boolean>>({})
  /** The answer currently typing itself out. */
  const [arrivingId, setArrivingId] = useState<string | null>(null)
  const [retrieval, setRetrieval] = useState<Retrieval | null>(null)

  /** Monotonic counters, so ids never come from inside a state updater. */
  const turnSerial = useRef(0)
  const replyCount = useRef(0)
  const ticketCount = useRef(0)
  /** How many times the current question has been retried, so Try again walks
      the alternates instead of repeating the same answer. */
  const takeCount = useRef(0)

  // One clock for the whole retrieval: search, then a beat per article, then
  // the write. Each tick reschedules the next, so cancelling drops all of it.
  useEffect(() => {
    if (!retrieval) return

    if (retrieval.phase === "searching") {
      const timer = window.setTimeout(
        () =>
          setRetrieval((current) =>
            current ? { ...current, phase: "reading" } : current
          ),
        SEARCH_MS
      )
      return () => window.clearTimeout(timer)
    }

    if (retrieval.phase === "reading") {
      const timer = window.setTimeout(() => {
        setRetrieval((current) => {
          if (!current) return current
          const next = current.readCount + 1
          return next >= current.matched.length
            ? {
                ...current,
                readCount: current.matched.length,
                phase: "writing",
              }
            : { ...current, readCount: next }
        })
      }, READ_MS)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      setTurns((current) => [
        ...current,
        { id: retrieval.id, ...retrieval.reply },
      ])
      setArrivingId(retrieval.id)
      setRetrieval(null)
    }, WRITE_MS)
    return () => window.clearTimeout(timer)
  }, [retrieval])

  // The settle waits out the reveal's own duration, so a long answer is never
  // cut mid type; reduced motion reveals it whole and settles straight away.
  useEffect(() => {
    if (!arrivingId) return
    const arriving = turns.find((turn) => turn.id === arrivingId)
    const text = arriving ? leadText(arriving) : ""
    const settle = prefersReducedMotion()
      ? SETTLE_MS
      : revealDurationMs(text) + SETTLE_MS
    const timer = window.setTimeout(() => setArrivingId(null), settle)
    return () => window.clearTimeout(timer)
  }, [arrivingId, turns])

  /** Sends a question into the knowledge base and starts the reading. */
  function startReply(prompt: string) {
    const reply = composeReply(prompt, replyCount.current++, takeCount.current)
    setRetrieval({
      id: `reply_${++turnSerial.current}`,
      phase: "searching",
      matched: reply.matched,
      readCount: 0,
      reply,
    })
  }

  /** A line the panel owes the reader right now, with no reading beat: it is
      the consequence of something they just pressed. */
  function settleWith(text: string) {
    const id = `said_${++turnSerial.current}`
    setTurns((current) => [...current, { id, kind: "said", text }])
    setArrivingId(id)
  }

  function send(text: string) {
    setTurns((current) => [
      ...current,
      { id: `asked_${++turnSerial.current}`, kind: "asked", text },
    ])
    setShowEmpty(false)
    takeCount.current = 0
    startReply(text)
  }

  /** Drops whatever is in flight: a retrieval mid read, or an answer still
      typing. Nothing half written is left in the transcript. */
  function stop() {
    setRetrieval(null)
    setArrivingId(null)
  }

  /** Answers the question above a turn again. The rotating counter means the
      second attempt is a different answer, not the same words twice. */
  function redo(turnId: string) {
    const index = turns.findIndex((turn) => turn.id === turnId)
    if (index < 0) return
    let askIndex = index - 1
    while (askIndex >= 0 && turns[askIndex].kind !== "asked") askIndex -= 1
    const ask = turns[askIndex]
    if (!ask || ask.kind !== "asked") return
    takeCount.current += 1
    setTurns(turns.slice(0, index))
    setArrivingId(null)
    startReply(ask.text)
  }

  /** The only path off the knowledge base. Opening a ticket is a real event,
      so it lands in the transcript rather than only changing a button. */
  function contact(turnId: string) {
    setContacted((current) => ({ ...current, [turnId]: true }))
    settleWith(ticketOpenedText(ticketCount.current++))
  }

  function vote(turnId: string, next: Vote) {
    setVotes((current) => ({ ...current, [turnId]: next }))
  }

  /** Clears the conversation. Tickets already opened are not undone by it. */
  function newChat() {
    setShowEmpty(true)
    setTurns([])
    setVotes({})
    setContacted({})
    setRetrieval(null)
    setArrivingId(null)
  }

  return (
    // Every tooltip in the block needs this ancestor to open.
    <TooltipProvider delay={200}>
      <SidebarProvider
        className="h-svh"
        // customize: --sidebar paints the whole panel; card reads as a surface
        // docked to the page, where the sidebar token reads as chrome.
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
          <DocsPage />
        </SidebarInset>

        <AskPanel
          turns={turns}
          arrivingId={arrivingId}
          retrieval={retrieval}
          showEmpty={showEmpty}
          showSteps={showSteps}
          onShowStepsChange={setShowSteps}
          votes={votes}
          contacted={contacted}
          onVote={vote}
          onContact={contact}
          onSend={send}
          onStop={stop}
          onNewChat={newChat}
          onRedo={redo}
        />
      </SidebarProvider>
    </TooltipProvider>
  )
}