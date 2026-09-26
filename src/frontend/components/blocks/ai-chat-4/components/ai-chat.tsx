"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { ChatPanel } from "./chat-panel"
import { copyText } from "./chat-thread"
import {
  draftReply,
  MODELS,
  MODES,
  STOPPED_NOTE,
  THREADS,
  type ChatMessageRecord,
  type SourceRecord,
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

export function AiChat() {
  const [threadId, setThreadId] = useState(THREADS[0].id)
  /** New chat parks the panel on its zero state until the next send. */
  const [showEmpty, setShowEmpty] = useState(false)
  const [messages, setMessages] = useState<ChatMessageRecord[]>(
    THREADS[0].messages
  )
  /** The next answer, held back for a beat so the thinking state is on screen. */
  const [pending, setPending] = useState<ChatMessageRecord | null>(
    THREADS[0].opening
  )
  /** The answer currently typing itself out. */
  const [arrivingId, setArrivingId] = useState<string | null>(null)
  /** Answers cut short, so their note survives the reveal ending. */
  const [stoppedIds, setStoppedIds] = useState<string[]>([])
  /** The sentence the next message is answering, picked out of an answer. */
  const [quote, setQuote] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<SourceRecord[]>([])
  const [modelId, setModelId] = useState(MODELS[0].id)
  const [modeId, setModeId] = useState(MODES[0].id)
  /** Text Edit loads back into the composer; the serial forces a re-load. */
  const [draft, setDraft] = useState<{ text: string; serial: number } | null>(
    null
  )

  /** Monotonic counters, so ids never come from inside a state updater. */
  const turnSerial = useRef(0)
  const editSerial = useRef(0)
  /** What the arriving answer has on screen, so a Stop settles exactly that. */
  const liveShown = useRef<string | null>(null)

  const thread = THREADS.find((entry) => entry.id === threadId)

  // One delivery path for every answer: the seeded one, a send, and a retry all
  // wait the same beat and then start typing.
  useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => {
      setMessages((current) => [...current, pending])
      setArrivingId(pending.id)
      setPending(null)
    }, THINK_MS)
    return () => window.clearTimeout(timer)
  }, [pending])

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

  function reply(prompt: string, quoted: string | null) {
    const serial = ++turnSerial.current
    setPending({
      id: `reply_${serial}`,
      role: "assistant",
      at: "Now",
      ...draftReply(prompt, serial, quoted),
    })
  }

  /** The one send path: the composer, a quick reply and a palette row all land
      here, so every turn is committed the same way. */
  function send(text: string) {
    const serial = ++turnSerial.current
    setMessages((current) => [
      ...current,
      {
        id: `sent_${serial}`,
        role: "user",
        at: "Now",
        text,
        quote: quote ?? undefined,
        sourceIds: attachments.length
          ? attachments.map((source) => source.id)
          : undefined,
      },
    ])
    reply(text, quote)
    setShowEmpty(false)
    setQuote(null)
    setAttachments([])
  }

  /** Keeps only the text that had arrived and marks that answer as stopped. */
  function stop() {
    if (pending) {
      // Nothing had arrived, so the thread says why rather than trailing off.
      const serial = ++turnSerial.current
      setPending(null)
      setMessages((current) => [
        ...current,
        {
          id: `stopped_${serial}`,
          role: "assistant",
          at: "Now",
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
    reply(prompt, null)
  }

  function loadThread(id: string) {
    const next = THREADS.find((entry) => entry.id === id) ?? THREADS[0]
    setThreadId(next.id)
    setShowEmpty(false)
    setMessages(next.messages)
    setPending(next.opening)
    setArrivingId(null)
    setStoppedIds([])
    setQuote(null)
    setAttachments([])
  }

  function newChat() {
    setShowEmpty(true)
    setMessages([])
    setPending(null)
    setArrivingId(null)
    setStoppedIds([])
    setQuote(null)
    setAttachments([])
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
          threadId={threadId}
          onThreadChange={loadThread}
          messages={messages}
          separator={showEmpty ? undefined : thread?.separator}
          thinking={pending !== null}
          arrivingId={arrivingId}
          stoppedIds={stoppedIds}
          showEmpty={showEmpty}
          quote={quote}
          onQuoteChange={setQuote}
          attachments={attachments}
          onAttach={(source) =>
            setAttachments((current) =>
              current.some((item) => item.id === source.id)
                ? current
                : [...current, source]
            )
          }
          onDetach={(id) =>
            setAttachments((current) =>
              current.filter((source) => source.id !== id)
            )
          }
          modelId={modelId}
          onModelChange={setModelId}
          modeId={modeId}
          onModeChange={setModeId}
          draft={draft}
          onSend={send}
          onStop={stop}
          onRetry={retry}
          onEdit={(text) => setDraft({ text, serial: ++editSerial.current })}
          onShown={(text) => {
            liveShown.current = text
          }}
          onNewChat={newChat}
          onCopyTranscript={() =>
            copyText(
              messages
                .map((message) => `${message.title ?? "You"}\n${message.text}`)
                .join("\n\n")
            )
          }
        />
      </SidebarProvider>
    </TooltipProvider>
  )
}