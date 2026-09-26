/**
 * Types + static copy for the ai-chat-1 block. The block's demo fixtures
 * (threads, transcripts, canned replies, model list) are gone: threads and
 * messages come from `/api/threads` and `/api/chat` (core-guardian).
 */

export const ASSISTANT_NAME = "Assistant"

export type PersonRecord = {
  name: string
  initials: string
  avatar?: string
}

/** There are no accounts here — every user turn is "you". */
export const YOU: PersonRecord = { name: "You", initials: "You" }

export const NEW_THREAD_ID = "new"

export type StarterCategory = { id: string; label: string; prompts: string[] }

/** Welcome screen: a category rail plus the questions it suggests. */
export const STARTER_CATEGORIES: StarterCategory[] = [
  {
    id: "create",
    label: "Create",
    prompts: [
      "Draft a task description for adding rate limiting to the public API",
      "Write release notes for a dashboard redesign",
      "Outline a rollback plan for a failed D1 migration",
    ],
  },
  {
    id: "explore",
    label: "Explore",
    prompts: [
      "What should a /health endpoint check on a Cloudflare Worker?",
      "Compare D1, KV and R2 for storing chat transcripts",
      "When is a service binding better than a public fetch?",
    ],
  },
  {
    id: "code",
    label: "Code",
    prompts: [
      "Write a Hono route with zod-openapi validation for creating a note",
      "Write a Drizzle schema for tags with a many-to-many mapping table",
      "Explain this error: string === SecretsStoreSecret is always false",
    ],
  },
  {
    id: "learn",
    label: "Learn",
    prompts: [
      "How do Astro islands decide when to hydrate?",
      "Explain Cloudflare Workers service bindings in plain terms",
      "What does an AI router do that a direct model call doesn't?",
    ],
  },
]

export type ThreadRecord = {
  id: string
  title: string
  updatedLabel: string
  recency: "today" | "earlier"
  pinned: boolean
  artifact?: string
}

export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "code"; language: string; code: string; filename?: string }
  | { kind: "image"; src: string; alt: string; caption: string }
  | { kind: "file"; name: string; meta: string }

export type ChatMessageRecord = {
  id: string
  role: "user" | "assistant"
  /** Null on assistant turns. */
  author: PersonRecord | null
  parts: MessagePart[]
  at: string
  reactions?: string[]
}

export type TranscriptRecord = {
  messages: ChatMessageRecord[]
  pending?: { activityLabel: string; parts: MessagePart[]; at: string; rest?: string }
  compacted?: string
  dateLabel?: string
}

/**
 * Split model markdown into the block's parts: fenced code becomes a `code`
 * part (rendered by the ReUI CodeBlock artifact), everything else stays text.
 */
export function toParts(markdown: string): MessagePart[] {
  const parts: MessagePart[] = []
  const fence = /```([\w+-]*)[^\n]*\n([\s\S]*?)```/g
  let last = 0
  for (const m of markdown.matchAll(fence)) {
    const before = markdown.slice(last, m.index).trim()
    if (before) parts.push({ kind: "text", text: before })
    parts.push({ kind: "code", language: m[1] || "text", code: m[2].replace(/\n$/, "") })
    last = (m.index ?? 0) + m[0].length
  }
  const rest = markdown.slice(last).trim()
  if (rest || parts.length === 0) parts.push({ kind: "text", text: rest })
  return parts
}
