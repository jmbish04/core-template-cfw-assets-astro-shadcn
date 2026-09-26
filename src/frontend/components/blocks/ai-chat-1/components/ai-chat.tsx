/**
 * @fileoverview AI chat — ReUI Pro block `ai-chat-1`, wired to core-guardian.
 *
 * Taken from the block: the header thread switcher (tabbed popover), the
 * starter view, the transcript (grouped turns, reveal animation, ReUI
 * CodeBlock artifacts, copy/like row, jump-to-latest) and the docked composer.
 * Replaced: every fixture. Threads come from `GET /api/threads`, messages from
 * `GET /api/threads/{id}/messages`, and a send is `POST /api/chat`, which the
 * Worker routes through the core-guardian service binding (metered, budgeted,
 * model picked per message). Stripped: model picker (the router picks),
 * memory toggle, terms banner, pinning (no backend for them).
 *
 * The open thread lives in `?t=<id>` so a chat has a real, shareable URL.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDownIcon, DownloadIcon, EllipsisVerticalIcon, LinkIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { FrontendErrorDialog } from "@/components/FrontendErrorDialog"
import { Alert, AlertAction, AlertDescription } from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ApiError, apiGet, apiSend } from "@/lib/api"
import { useFrontendErrorHandler } from "@/lib/error-handler"
import { relativeTime } from "@/lib/format"

import { ChatThread } from "./chat-thread"
import { Composer, type ChatUsage } from "./composer"
import { NEW_THREAD_ID, toParts, YOU, type ChatMessageRecord, type ThreadRecord } from "./data"

// ── Wire shapes (src/backend/api/routes/threads.ts + chat.ts) ──

type ApiThread = { id: string; title: string; createdAt: number | string; updatedAt: number | string }
type ApiMessage = {
  id: string
  threadId: string
  role: "user" | "assistant" | "system"
  content: string
  provider: string | null
  model: string | null
  costUsd: number | null
  createdAt: number | string
}
type ChatReply = { threadId: string; message: ApiMessage }

const WAITING_LABEL = "Routing through core-guardian"

const THREAD_TABS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "earlier", label: "Earlier" },
]

const ms = (v: number | string) => (typeof v === "number" ? v : Date.parse(v))
const clock = (v: number | string) =>
  new Date(ms(v)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

function toThread(t: ApiThread): ThreadRecord {
  const updated = ms(t.updatedAt)
  return {
    id: t.id,
    title: t.title || "Untitled chat",
    updatedLabel: relativeTime(updated),
    recency: new Date(updated).toDateString() === new Date().toDateString() ? "today" : "earlier",
    pinned: false,
  }
}

function toRecord(m: ApiMessage): ChatMessageRecord {
  return {
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    author: m.role === "user" ? YOU : null,
    parts: m.role === "user" ? [{ kind: "text", text: m.content }] : toParts(m.content),
    at: clock(m.createdAt),
  }
}

const routeOf = (m: ApiMessage) => (m.provider && m.model ? `${m.provider} · ${m.model}` : null)

function readThreadParam() {
  if (typeof window === "undefined") return NEW_THREAD_ID
  return new URLSearchParams(window.location.search).get("t") ?? NEW_THREAD_ID
}

function writeThreadParam(id: string) {
  const url = new URL(window.location.href)
  if (id === NEW_THREAD_ID) url.searchParams.delete("t")
  else url.searchParams.set("t", id)
  window.history.replaceState(null, "", url)
}

function SwitcherRow({ thread, isActive, onSelect }: { thread: ThreadRecord; isActive: boolean; onSelect: (id: string) => void }) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      aria-current={isActive ? "true" : undefined}
      onClick={() => onSelect(thread.id)}
      className="h-auto w-full items-center justify-between gap-2 px-2 py-1.5 text-sm font-normal"
    >
      <span className="min-w-0 flex-1 truncate text-start">{thread.title}</span>
      <span className="text-muted-foreground shrink-0 text-end text-[11px] tabular-nums">{thread.updatedLabel}</span>
    </Button>
  )
}

/** Header leading control: names the open chat and switches between them. */
function ThreadSwitcher({
  title,
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
}: {
  title: string
  threads: ThreadRecord[]
  activeThreadId: string
  onSelectThread: (id: string) => void
  onNewChat: () => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(THREAD_TABS[0].id)
  const select = (id: string) => {
    setOpen(false)
    onSelectThread(id)
  }
  const list = (items: ThreadRecord[]) =>
    items.length ? (
      <div className="flex flex-col gap-1">
        {items.map((t) => (
          <SwitcherRow key={t.id} thread={t} isActive={t.id === activeThreadId} onSelect={select} />
        ))}
      </div>
    ) : (
      <p className="text-muted-foreground px-2 py-6 text-center text-sm">No chats here yet.</p>
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="sm" className="-ms-1 min-w-0 shrink gap-1.5 px-2 font-medium" />}>
        <span className="min-w-0 truncate">{title}</span>
        <ChevronDownIcon className="opacity-60" data-icon="inline-end" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="flex max-h-96 w-84 max-w-(--available-width) flex-col p-0">
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="border-border flex h-11 shrink-0 items-center gap-1 border-b px-2">
            <TabsList variant="line" className="h-full gap-0 p-0">
              {THREAD_TABS.map((item) => (
                <TabsTrigger key={item.id} value={item.id} className="h-full! flex-none px-2 after:-bottom-px!">
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="New chat"
                    className="ms-auto"
                    onClick={() => {
                      setOpen(false)
                      onNewChat()
                    }}
                  />
                }
              >
                <PlusIcon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>New chat</TooltipContent>
            </Tooltip>
          </div>
          {THREAD_TABS.map((item) => (
            <TabsContent key={item.id} value={item.id} className="scrollbar min-h-0 flex-1 overflow-y-auto p-2">
              {list(item.id === "all" ? threads : threads.filter((t) => t.recency === item.id))}
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

export function AiChat() {
  const [threads, setThreads] = useState<ThreadRecord[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string>(NEW_THREAD_ID)
  const [messages, setMessages] = useState<ChatMessageRecord[]>([])
  const [raw, setRaw] = useState<ApiMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [arrivingId, setArrivingId] = useState<string | null>(null)
  const [stoppedIds, setStoppedIds] = useState<string[]>([])
  const [sendError, setSendError] = useState<{ text: string; message: string } | null>(null)
  const abort = useRef<AbortController | null>(null)
  const { activeError, copyState, handleError, clearError, copyErrorPrompt } = useFrontendErrorHandler()

  const loadThreads = useCallback(async () => {
    try {
      const { data } = await apiGet<{ data: ApiThread[] }>("threads")
      setThreads(data.map(toThread))
    } catch (error) {
      handleError({
        sourcePage: { url: window.location.href, file: "src/frontend/pages/chat.astro" },
        codeSource: { file: "components/blocks/ai-chat-1/components/ai-chat.tsx", functionName: "loadThreads", description: "GET /api/threads" },
        errorDetails: { friendlyError: "Couldn’t load your chats. Reload the page to try again.", serverError: error },
      })
    }
  }, [handleError])

  const openThread = useCallback(
    async (id: string) => {
      abort.current?.abort()
      setActiveThreadId(id)
      writeThreadParam(id)
      setStreaming(false)
      setArrivingId(null)
      setSendError(null)
      setMessages([])
      setRaw([])
      if (id === NEW_THREAD_ID) return
      try {
        const { data } = await apiGet<{ data: ApiMessage[] }>(`threads/${id}/messages`)
        const visible = data.filter((m) => m.role !== "system")
        setRaw(visible)
        setMessages(visible.map(toRecord))
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          toast.error("That chat no longer exists.")
          void openThread(NEW_THREAD_ID)
          return
        }
        handleError({
          sourcePage: { url: window.location.href, file: "src/frontend/pages/chat.astro" },
          codeSource: { file: "components/blocks/ai-chat-1/components/ai-chat.tsx", functionName: "openThread", description: `GET /api/threads/${id}/messages` },
          errorDetails: { friendlyError: "Couldn’t load this chat. Try opening it again.", serverError: error },
        })
      }
    },
    [handleError],
  )

  useEffect(() => {
    void loadThreads()
    void openThread(readThreadParam())
    return () => abort.current?.abort()
  }, [loadThreads, openThread])

  const usage: ChatUsage = useMemo(() => {
    const replies = raw.filter((m) => m.role === "assistant")
    return {
      replies: replies.length,
      costUsd: replies.reduce((sum, m) => sum + (m.costUsd ?? 0), 0),
      lastRoute: replies.length ? routeOf(replies[replies.length - 1]) : null,
    }
  }, [raw])

  const title = threads.find((t) => t.id === activeThreadId)?.title ?? "New chat"

  async function handleSend(text: string) {
    if (streaming) return
    setSendError(null)
    const optimistic: ChatMessageRecord = {
      id: `local_${Date.now()}`,
      role: "user",
      author: YOU,
      parts: [{ kind: "text", text }],
      at: clock(Date.now()),
    }
    setMessages((current) => [...current, optimistic])
    setStreaming(true)
    const controller = new AbortController()
    abort.current = controller
    const threadId = activeThreadId === NEW_THREAD_ID ? undefined : activeThreadId

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ threadId, message: text }),
        signal: controller.signal,
      })
      const body: any = await res.json().catch(() => null)
      if (!res.ok) throw new ApiError(res.status, body?.error ?? `The assistant didn’t answer (HTTP ${res.status}).`, body)
      const reply = body as ChatReply

      if (!threadId) {
        setActiveThreadId(reply.threadId)
        writeThreadParam(reply.threadId)
      }
      setRaw((current) => [...current, reply.message])
      setMessages((current) => [...current, toRecord(reply.message)])
      setArrivingId(reply.message.id) // the block types it out, then onArrived settles
      void loadThreads()
    } catch (error) {
      setStreaming(false)
      if (controller.signal.aborted) {
        setStoppedIds((current) => [...current, optimistic.id])
        return
      }
      // A failed send is user-actionable (budget, rate limit): say so inline and offer a retry.
      setMessages((current) => current.filter((m) => m.id !== optimistic.id))
      setSendError({
        text,
        message: error instanceof ApiError ? error.message : "Couldn’t reach the assistant. Check your connection and retry.",
      })
    }
  }

  function handleStop() {
    abort.current?.abort()
    if (arrivingId) setStoppedIds((current) => [...current, arrivingId])
    setArrivingId(null)
    setStreaming(false)
  }

  function handleCopyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast("Link copied"))
      .catch(() => toast.error("Copy failed — your browser blocked clipboard access."))
  }

  function handleExport() {
    const md = raw.map((m) => `**${m.role === "user" ? "You" : "Assistant"}** — ${new Date(ms(m.createdAt)).toISOString()}\n\n${m.content}`).join("\n\n---\n\n")
    const url = URL.createObjectURL(new Blob([`# ${title}\n\n${md}\n`], { type: "text/markdown" }))
    const a = Object.assign(document.createElement("a"), { href: url, download: `${title.replace(/[^\w-]+/g, "-").toLowerCase() || "chat"}.md` })
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete() {
    if (activeThreadId === NEW_THREAD_ID) return
    try {
      await apiSend("DELETE", `threads/${activeThreadId}`)
      toast("Chat deleted")
      await Promise.all([loadThreads(), openThread(NEW_THREAD_ID)])
    } catch {
      toast.error("Couldn’t delete this chat. Try again.")
    }
  }

  const hasThread = activeThreadId !== NEW_THREAD_ID

  return (
    // Fills the shell's content area (viewport minus the 3rem site header).
    <div className="bg-background text-foreground flex h-[calc(100svh-3rem)] min-h-0 w-full flex-col">
      <header className="bg-background/70 supports-backdrop-filter:bg-background/60 after:from-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 px-3 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-6 after:bg-gradient-to-b after:to-transparent sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ThreadSwitcher
            title={title}
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={(id) => void openThread(id)}
            onNewChat={() => void openThread(NEW_THREAD_ID)}
          />
          {streaming ? (
            <Badge variant="primary-light" size="sm" className="shrink-0 max-md:hidden">
              Working
            </Badge>
          ) : usage.lastRoute ? (
            <Badge variant="outline" size="sm" className="text-muted-foreground max-w-56 shrink-0 font-mono font-normal max-md:hidden">
              <span className="truncate">{usage.lastRoute}</span>
            </Badge>
          ) : null}
        </div>

        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="New chat" onClick={() => void openThread(NEW_THREAD_ID)} />}>
            <PlusIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>New chat</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Chat options" disabled={!hasThread} />}>
            <EllipsisVerticalIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>This chat</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleCopyLink}>
                <LinkIcon aria-hidden="true" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <DownloadIcon aria-hidden="true" />
                Export as Markdown
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void handleDelete()}>
              <Trash2Icon aria-hidden="true" />
              Delete chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <ChatThread
          transcript={{ messages }}
          title={title}
          streaming={streaming}
          stopped={false}
          arrivingId={arrivingId}
          stoppedIds={stoppedIds}
          threads={threads}
          activityLabel={WAITING_LABEL}
          onStart={(text) => void handleSend(text)}
          onSelectThread={(id) => void openThread(id)}
          onArrived={() => {
            setArrivingId(null)
            setStreaming(false)
          }}
        />

        {sendError ? (
          <div className="shrink-0 px-3 pb-2 sm:px-4">
            <Alert variant="destructive" className="mx-auto max-w-3xl items-center py-2 text-sm">
              <AlertDescription>{sendError.message}</AlertDescription>
              <AlertAction className="flex items-center gap-1">
                <Button variant="outline" size="xs" onClick={() => void handleSend(sendError.text)}>
                  Retry
                </Button>
                <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={() => setSendError(null)}>
                  <XIcon aria-hidden="true" />
                </Button>
              </AlertAction>
            </Alert>
          </div>
        ) : null}

        <div className="shrink-0 px-3 pb-4 sm:px-4">
          <Composer streaming={streaming} usage={usage} onSend={(text) => void handleSend(text)} onStop={handleStop} />
        </div>
      </main>

      <FrontendErrorDialog
        error={activeError}
        copyState={copyState}
        onCopyPrompt={copyErrorPrompt}
        onOpenChange={(open) => !open && clearError()}
      />
    </div>
  )
}
