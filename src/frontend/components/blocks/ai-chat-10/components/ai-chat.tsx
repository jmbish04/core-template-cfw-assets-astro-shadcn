import { useEffect, useRef, useState } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"

import { ChatHeader } from "./chat-header"
import { ChatThread } from "./chat-thread"
import { Composer } from "./composer"
import {
  askText,
  CHATS,
  draftReply,
  MODELS,
  NEW_CHAT_ID,
  SOURCES,
  type ChatMessageRecord,
} from "./data"
import { StarterCards, WelcomeHero } from "./welcome"

/** Beat before the reply starts typing itself out. */
const REPLY_DELAY_MS = 700

const ALL_SOURCE_IDS = SOURCES.map((source) => source.id)

/** A follow up the reply offers when a file it needed was switched off. */
const RERUN_PREFIX = "Include "
const RERUN_SUFFIX = " and rerun"

export function AiChat() {
  const [activeChatId, setActiveChatId] = useState(NEW_CHAT_ID)
  const [messages, setMessages] = useState<ChatMessageRecord[]>([])
  const [draft, setDraft] = useState("")
  const [modelId, setModelId] = useState(MODELS[0].id)
  const [scopeIds, setScopeIds] = useState<string[]>(ALL_SOURCE_IDS)
  const [memoryOn, setMemoryOn] = useState(true)
  const [streaming, setStreaming] = useState(false)
  /** The step named while the reply is prepared, taken from the draft itself. */
  const [activity, setActivity] = useState("Checking the connected sources")
  /** The reply currently typing itself out, so the thread can animate it. */
  const [arrivingId, setArrivingId] = useState<string | null>(null)
  /** Replies a Stop cut short. They stay cut short, even after the next send. */
  const [stoppedIds, setStoppedIds] = useState<string[]>([])

  const field = useRef<HTMLTextAreaElement>(null)
  const replyTimer = useRef<number | null>(null)
  /** Rotates the answer wording, so a rerun is genuinely a different reply. */
  const variant = useRef(0)
  /** Only ever climbs, so a regenerated reply cannot reuse a retired key. */
  const turnCount = useRef(0)

  const activeChat = CHATS.find((chat) => chat.id === activeChatId)
  const firstAsk = messages.find((message) => message.role === "user")
  const title = activeChat?.title ?? (firstAsk ? askText(firstAsk) : "New chat")

  useEffect(() => {
    return () => {
      if (replyTimer.current) window.clearTimeout(replyTimer.current)
    }
  }, [])

  /** Builds one settled exchange, used when a saved chat is opened. */
  function replayChat(prompt: string) {
    const reply = draftReply(prompt, scopeIds)
    return [
      {
        id: "replay_ask",
        role: "user" as const,
        at: "Earlier",
        parts: [{ kind: "text" as const, text: prompt }],
        contextIds: scopeIds,
      },
      {
        id: "replay_reply",
        role: "assistant" as const,
        at: "Earlier",
        parts: reply.parts,
        modelId,
        followUps: reply.followUps,
      },
    ]
  }

  function clearTimer() {
    if (replyTimer.current) window.clearTimeout(replyTimer.current)
    replyTimer.current = null
  }

  /** A short wait, then the reply types itself out before the beat settles.
      Ids are computed here, before any dispatch, never inside an updater. */
  function beginReply(prompt: string, scope: string[]) {
    clearTimer()
    const reply = draftReply(prompt, scope, variant.current)
    turnCount.current += 1
    const replyId = `reply_${turnCount.current}`
    setActivity(reply.activity)
    setStreaming(true)
    replyTimer.current = window.setTimeout(() => {
      replyTimer.current = null
      setMessages((current) => [
        ...current,
        {
          id: replyId,
          role: "assistant",
          at: "Now",
          parts: reply.parts,
          modelId,
          followUps: reply.followUps,
        },
      ])
      setArrivingId(replyId)
    }, REPLY_DELAY_MS)
  }

  function handleSend(text: string) {
    // "Include churn-q3.csv and rerun" is the reply's own offer to fix the
    // gap, so it puts the file back in scope instead of asking it as a question.
    const isRerun = text.startsWith(RERUN_PREFIX) && text.endsWith(RERUN_SUFFIX)
    const restored = isRerun
      ? SOURCES.find(
          (source) =>
            source.name ===
            text.slice(RERUN_PREFIX.length, text.length - RERUN_SUFFIX.length)
        )
      : undefined

    const scope =
      restored && !scopeIds.includes(restored.id)
        ? [...scopeIds, restored.id]
        : scopeIds
    if (scope !== scopeIds) setScopeIds(scope)

    const lastAsk = [...messages]
      .reverse()
      .find((message) => message.role === "user")
    // A rerun repeats the question the miss answered rather than sending the
    // offer itself, which would only be a sentence about a file.
    const prompt = restored && lastAsk ? askText(lastAsk) : text

    variant.current = 0
    setDraft("")
    setArrivingId(null)
    turnCount.current += 1
    setMessages((current) => [
      ...current,
      {
        id: `ask_${turnCount.current}`,
        role: "user",
        at: "Now",
        parts: [{ kind: "text", text: prompt }],
        contextIds: scope,
      },
    ])
    beginReply(prompt, scope)
  }

  /** The reveal reports when its last chunk lands, so a long answer runs as
      long as it needs to instead of being cut off by a timer that guessed. */
  function handleArrived() {
    setArrivingId(null)
    setStreaming(false)
  }

  function handleStop() {
    clearTimer()
    // Frozen where it got to, so Stop keeps the half written answer instead of
    // handing back the rest of it.
    if (arrivingId) setStoppedIds((current) => [...current, arrivingId])
    setArrivingId(null)
    setStreaming(false)
  }

  function handleRegenerate() {
    const lastAsk = [...messages]
      .reverse()
      .find((message) => message.role === "user")
    if (!lastAsk) return
    variant.current += 1
    setMessages((current) => {
      const cut = current.findIndex((message) => message.id === lastAsk.id)
      return current.slice(0, cut + 1)
    })
    beginReply(askText(lastAsk), scopeIds)
  }

  function handleSelectChat(id: string) {
    const chat = CHATS.find((item) => item.id === id)
    if (!chat) return
    clearTimer()
    variant.current = 0
    setActiveChatId(id)
    setMessages(replayChat(chat.prompt))
    setDraft("")
    setArrivingId(null)
    setStoppedIds([])
    setStreaming(false)
  }

  function handleNewChat() {
    clearTimer()
    variant.current = 0
    setActiveChatId(NEW_CHAT_ID)
    setMessages([])
    setDraft("")
    setArrivingId(null)
    setStoppedIds([])
    setStreaming(false)
  }

  const composer = (
    <Composer
      value={draft}
      onValueChange={setDraft}
      fieldRef={field}
      scopeIds={scopeIds}
      onScopeChange={setScopeIds}
      modelId={modelId}
      onModelChange={setModelId}
      streaming={streaming}
      onSend={handleSend}
      onStop={handleStop}
    />
  )

  return (
    // Every tooltip in the block needs this ancestor to open.
    <TooltipProvider>
      <div className="bg-background text-foreground flex h-svh min-h-0 w-full flex-col">
        <ChatHeader
          title={title}
          activeChatId={activeChatId}
          streaming={streaming}
          activityLabel={activity}
          memoryOn={memoryOn}
          onToggleMemory={() => setMemoryOn((current) => !current)}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
        />

        <main className="flex min-h-0 flex-1 flex-col">
          {messages.length === 0 ? (
            // Centred while it fits, scrolled once the cards run past the fold.
            <div className="scrollbar flex min-h-0 flex-1 overflow-y-auto px-3 sm:px-4">
              {/* Two levels of rhythm, not one uniform gap: the greeting sits
                  clear of the ask box, and the starters ride close under it. */}
              <div className="m-auto flex w-full max-w-3xl flex-col gap-16 py-10">
                <WelcomeHero />
                <div className="flex flex-col gap-3">
                  {composer}
                  <StarterCards onPick={handleSend} />
                </div>
              </div>
            </div>
          ) : (
            <>
              <ChatThread
                messages={messages}
                streaming={streaming}
                stoppedIds={stoppedIds}
                arrivingId={arrivingId}
                activityLabel={activity}
                onRegenerate={handleRegenerate}
                onSend={handleSend}
                onArrived={handleArrived}
              />
              <div className="shrink-0 px-3 pb-4 sm:px-4">
                <div className="mx-auto w-full max-w-3xl">{composer}</div>
              </div>
            </>
          )}
        </main>
      </div>
    </TooltipProvider>
  )
}