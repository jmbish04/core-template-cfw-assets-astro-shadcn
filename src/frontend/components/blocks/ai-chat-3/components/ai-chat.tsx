import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/reui/badge"
import { IconTile } from "@/components/reui/icon-tile"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { ScopeAnswer } from "./chat-questionnaire"
import { ChatThread } from "./chat-thread"
import { Composer } from "./composer"
import {
  ASSISTANT_NAME,
  draftReply,
  EFFORTS,
  MODELS,
  planFromScope,
  THREADS,
  type ChatMessageRecord,
  type ThreadRecord,
} from "./data"
import { Welcome } from "./welcome"
import { SparklesIcon, PlusIcon, ChevronDownIcon } from "lucide-react"

/** The plan step a thinking toggle buys before the answer starts arriving. */
const PLANNING_LABEL = "Planning the answer"

export function AiChat() {
  const [modelId, setModelId] = useState(MODELS[0].id)
  /** The composer's text, held here so a starter card can fill it. */
  const [draft, setDraft] = useState("")
  const [contextIds, setContextIds] = useState<string[]>([])
  const [effortId, setEffortId] = useState(EFFORTS[0].id)
  /** The resumed conversation, or null while this is still a new chat. */
  const [thread, setThread] = useState<ThreadRecord | null>(null)
  const [messages, setMessages] = useState<ChatMessageRecord[]>([])
  const [streaming, setStreaming] = useState(false)
  const [activity, setActivity] = useState(PLANNING_LABEL)
  /** The reply currently typing itself out, so only that turn animates. */
  const [arrivingId, setArrivingId] = useState<string | null>(null)
  /** Replies a Stop cut short. They stay cut short from then on. */
  const [stoppedIds, setStoppedIds] = useState<string[]>([])
  /** Scope answers, keyed by the reply that asked for them. */
  const [scopeAnswers, setScopeAnswers] = useState<
    Record<string, ScopeAnswer[]>
  >({})

  const field = useRef<HTMLTextAreaElement>(null)
  const replyTimer = useRef<number | null>(null)
  /** Ids for turns added during the session, never colliding with seeded ones. */
  const turnCount = useRef(0)
  const replyCount = useRef(0)

  const activeModel = MODELS.find((model) => model.id === modelId) ?? MODELS[0]
  // The greeting owns the screen until there is a conversation to read.
  const inThread = messages.length > 0
  // An unsaved chat has no name yet, so it wears the question that started it.
  const opener = messages.find((message) => message.role === "user")?.parts[0]
  const title =
    thread?.title ?? (opener?.kind === "text" ? opener.text : "New chat")

  useEffect(() => {
    return () => {
      if (replyTimer.current) window.clearTimeout(replyTimer.current)
    }
  }, [])

  function clearTimer() {
    if (replyTimer.current) window.clearTimeout(replyTimer.current)
    replyTimer.current = null
  }

  function nextId() {
    turnCount.current += 1
    return `live_${turnCount.current}`
  }

  /**
   * The reveal reports when its last chunk lands, so a long answer runs as
   * long as it needs to instead of being cut off by a timer that guessed.
   */
  function handleArrived() {
    setArrivingId(null)
    setStreaming(false)
  }

  /** A short plan step, then the reply types itself out and settles. */
  function beginReply(prompt: string) {
    clearTimer()
    // Sending mid reply settles the one in flight, so the thinking Marker owns
    // the gap and the previous turn drops its caret at once.
    setArrivingId(null)
    const reply = draftReply(prompt, replyCount.current)
    replyCount.current += 1
    setStreaming(true)
    const planMs = (EFFORTS.find((item) => item.id === effortId) ?? EFFORTS[0])
      .planMs
    setActivity(planMs ? PLANNING_LABEL : reply.activity)

    const deliver = () => {
      setActivity(reply.activity)
      replyTimer.current = window.setTimeout(() => {
        replyTimer.current = null
        const id = nextId()
        setMessages((current) => [
          ...current,
          {
            id,
            role: "assistant",
            at: "Now",
            parts: reply.parts,
            // Only a mode that bought a plan step has a plan to show.
            reasoning: planMs ? reply.reasoning : undefined,
          },
        ])
        setArrivingId(id)
      }, 700)
    }

    if (planMs) replyTimer.current = window.setTimeout(deliver, planMs)
    else deliver()
  }

  /** Answering the scope form is a turn: it writes the plan it asked for. */
  function handleScopeAnswer(messageId: string, answers: ScopeAnswer[]) {
    if (scopeAnswers[messageId]) return
    setScopeAnswers((current) => ({ ...current, [messageId]: answers }))

    clearTimer()
    setArrivingId(null)
    setStreaming(true)
    setActivity("Writing the plan")

    replyTimer.current = window.setTimeout(() => {
      replyTimer.current = null
      const id = nextId()
      setMessages((current) => [
        ...current,
        {
          id,
          role: "assistant",
          at: "Now",
          parts: [{ kind: "text", text: planFromScope(answers) }],
        },
      ])
      setArrivingId(id)
    }, 700)
  }

  /** Drops the newest reply and asks the same question again. */
  function handleRetry() {
    const asked = [...messages].reverse().find((item) => item.role === "user")
    const prompt = asked?.parts
      .map((part) => (part.kind === "text" ? part.text : ""))
      .join(" ")
      .trim()
    if (!prompt) return

    setMessages((current) => {
      const next = [...current]
      while (next.length && next[next.length - 1].role === "assistant")
        next.pop()
      return next
    })
    beginReply(prompt)
  }

  /** Drops one reply, and any scope answers that belonged to it. */
  function handleDismiss(messageId: string) {
    setMessages((current) => current.filter((item) => item.id !== messageId))
    setScopeAnswers((current) => {
      if (!current[messageId]) return current
      const next = { ...current }
      delete next[messageId]
      return next
    })
  }

  function handleSend(text: string) {
    setMessages((current) => [
      ...current,
      {
        id: nextId(),
        role: "user",
        at: "Now",
        parts: [{ kind: "text", text }],
        contextIds: contextIds.length ? contextIds : undefined,
      },
    ])
    setDraft("")
    setContextIds([])
    beginReply(text)
  }

  /** Starters fill the composer and attach the context the row promised to
      read: the click is a contract, never an auto send. */
  function handleUseStarter(prompt: string, contextId: string) {
    // A dirty composer is appended to, never replaced: a starter click must
    // not destroy a half written thought.
    const typed = draft.trim()
    const next = typed ? `${typed} ${prompt}` : prompt
    setDraft(next)
    setContextIds((current) =>
      current.includes(contextId) ? current : [...current, contextId]
    )
    const box = field.current
    if (!box) return
    box.focus()
    // Caret to the end, so typing continues the prompt rather than splitting
    // it. The value lands on the next render, so this waits a beat.
    window.setTimeout(() => box.setSelectionRange(next.length, next.length))
  }

  function handleOpenThread(id: string) {
    const opened = THREADS.find((item) => item.id === id)
    if (!opened) return
    clearTimer()
    setThread(opened)
    setMessages(opened.messages)
    setStreaming(false)
    setArrivingId(null)
    setStoppedIds([])
    // Scope answers belong to the conversation that asked, so a switch must
    // not leave a fresh questionnaire pre-answered under a reused id.
    setScopeAnswers({})
    setContextIds([])
    setDraft("")
  }

  function handleNewChat() {
    clearTimer()
    setThread(null)
    setMessages([])
    setStreaming(false)
    setArrivingId(null)
    setStoppedIds([])
    setScopeAnswers({})
    setContextIds([])
    setDraft("")
    field.current?.focus()
  }

  return (
    // Every tooltip in the block needs this ancestor to open.
    <TooltipProvider>
      <div className="bg-background text-foreground flex h-svh w-full flex-col">
        {/* Translucent and blurred, with a short gradient under it, so the
            thread reads as passing beneath the header rather than stopping. */}
        <header className="bg-background/70 supports-backdrop-filter:bg-background/60 after:from-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 px-4 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-6 after:bg-gradient-to-b after:to-transparent sm:px-6">
          <IconTile variant="elevated" size="sm" aria-hidden="true">
            <SparklesIcon
            />
          </IconTile>
          {/* On a phone the thread name is worth more than the product name,
              and the avatar already carries the identity. */}
          <span
            className={cn(
              "shrink-0 text-sm font-medium",
              inThread && "max-sm:sr-only"
            )}
          >
            {ASSISTANT_NAME}
          </span>

          {inThread ? (
            <>
              <span
                aria-hidden="true"
                className="bg-muted-foreground/40 size-1 shrink-0 rounded-full max-sm:hidden"
              />
              {/* The greeting h1 unmounts with the welcome screen, so in a
                  thread the page heading is the thread's name. */}
              <h1 className="text-muted-foreground min-w-0 truncate text-sm font-normal">
                {title}
              </h1>
            </>
          ) : null}

          {streaming ? (
            <Badge variant="primary-light" className="shrink-0">
              Working
            </Badge>
          ) : null}

          <div className="ms-auto flex shrink-0 items-center gap-2">
            {inThread ? (
              <Button variant="ghost" size="sm" onClick={handleNewChat}>
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                <span className="max-sm:sr-only">New chat</span>
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    aria-label={`Model, ${activeModel.name}`}
                  />
                }
              >
                <span className="max-w-28 truncate sm:max-w-none">
                  {activeModel.name}
                </span>
                <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-0">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-muted-foreground px-2.5 pt-2.5 pb-1 text-xs font-normal">
                    Model
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={modelId}
                  onValueChange={(value) => value && setModelId(value)}
                  className="px-1.5 pb-1.5"
                >
                  {MODELS.map((model) => (
                    <DropdownMenuRadioItem
                      key={model.id}
                      value={model.id}
                      className="items-start gap-2 py-1.5"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-sm/5 font-medium">
                            {model.name}
                          </span>
                          {model.recommended ? (
                            <Badge variant="primary-light" size="sm">
                              Default
                            </Badge>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground truncate text-[11px]/4">
                          {model.provider}
                          <span
                            aria-hidden="true"
                            className="bg-muted-foreground/40 mx-1.5 inline-block size-1 rounded-full align-middle"
                          />
                          <span className="tabular-nums">{model.context}</span>{" "}
                          context
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {inThread ? (
          <ChatThread
            messages={messages}
            scopeAnswers={scopeAnswers}
            onScopeAnswer={handleScopeAnswer}
            modelName={activeModel.name}
            onRetry={handleRetry}
            onDismiss={handleDismiss}
            separator={thread?.separator ?? "Today"}
            streaming={streaming}
            activity={activity}
            arrivingId={arrivingId}
            stoppedIds={stoppedIds}
            onArrived={handleArrived}
          />
        ) : (
          <Welcome
            threads={THREADS}
            onUseStarter={handleUseStarter}
            onOpenThread={handleOpenThread}
          />
        )}

        {/* Docked to the foot of the viewport in both states, and mounted once
            so a starter fill survives the switch into the thread. */}
        <div className="shrink-0 px-4 pb-4 sm:px-6">
          <Composer
            value={draft}
            onValueChange={setDraft}
            fieldRef={field}
            contextIds={contextIds}
            onAddContext={(id) =>
              setContextIds((current) =>
                current.includes(id) ? current : [...current, id]
              )
            }
            onRemoveContext={(id) =>
              setContextIds((current) => current.filter((item) => item !== id))
            }
            effortId={effortId}
            onEffortChange={setEffortId}
            streaming={streaming}
            onSend={handleSend}
            onStop={() => {
              clearTimer()
              // Frozen where it got to, so Stop keeps the half written answer
              // instead of handing back the rest of it.
              if (arrivingId) {
                setStoppedIds((current) => [...current, arrivingId])
              } else {
                // Stopped before anything arrived: an empty stub keeps the
                // thread legible with a "Stopped by you" note.
                const id = nextId()
                setMessages((current) => [
                  ...current,
                  { id, role: "assistant", at: "Now", parts: [] },
                ])
                setStoppedIds((current) => [...current, id])
              }
              setArrivingId(null)
              setStreaming(false)
            }}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}