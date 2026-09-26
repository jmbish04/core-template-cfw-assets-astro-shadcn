import type { ReactNode } from "react"

import { AnthropicBlack } from "@/components/ui/svgs/anthropicBlack"
import { AnthropicWhite } from "@/components/ui/svgs/anthropicWhite"
import { Gemini } from "@/components/ui/svgs/gemini"
import { MistralAiLogo } from "@/components/ui/svgs/mistralAiLogo"
import { Openai } from "@/components/ui/svgs/openai"
import { OpenaiDark } from "@/components/ui/svgs/openaiDark"
import { BarChart3Icon, CodeIcon, FileTextIcon, BookOpenIcon } from "lucide-react"

export const ASSISTANT_NAME = "ReUI Chat"

export type PersonRecord = {
  name: string
  initials: string
  avatar: string
}

/** The person signed in: the greeting names them, and they send every turn. */
export const VIEWER: PersonRecord = {
  name: "Maya Chen",
  initials: "MC",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
}

/** The whole welcome line. The demo runs at a fixed 9:41 AM, so the greeting
    is a constant rather than something derived from a clock at render. */
export const GREETING = `Good morning, ${VIEWER.name.split(" ")[0]}.`

// ---------- models ----------

export type ModelRecord = {
  id: string
  name: string
  provider: string
  /** Called out in the picker as the default for most work. */
  recommended?: boolean
  /** Theme safe brand mark, light/dark pairs pre-wrapped. */
  logo: ReactNode
}

/** Paired marks swap per theme; single marks are theme safe as shipped. */
const ANTHROPIC_MARK = (
  <span aria-hidden="true" className="inline-flex size-4 shrink-0">
    <AnthropicBlack className="size-4 dark:hidden" />
    <AnthropicWhite className="hidden size-4 dark:block" />
  </span>
)

const OPENAI_MARK = (
  <span aria-hidden="true" className="inline-flex size-4 shrink-0">
    <Openai className="size-4 dark:hidden" />
    <OpenaiDark className="hidden size-4 dark:block" />
  </span>
)

const GEMINI_MARK = (
  <span aria-hidden="true" className="inline-flex size-4 shrink-0">
    <Gemini className="size-4" />
  </span>
)

const MISTRAL_MARK = (
  <span aria-hidden="true" className="inline-flex size-4 shrink-0">
    <MistralAiLogo className="size-4" />
  </span>
)

export const MODELS: ModelRecord[] = [
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    recommended: true,
    logo: ANTHROPIC_MARK,
  },
  {
    id: "gpt-5-1",
    name: "GPT-5.1",
    provider: "OpenAI",
    logo: OPENAI_MARK,
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    logo: GEMINI_MARK,
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral",
    logo: MISTRAL_MARK,
  },
]

// ---------- sources ----------

export type SourceRecord = {
  id: string
  /** The filename, shown on scope chips and named in every reply. */
  name: string
  kindLabel: string
  /** How a reply names the file once it has read it. */
  readLine: string
  syncedAt: string
  icon: ReactNode
}

/** All four start in scope. Toggling one off is how the guardrail is seen. */
export const SOURCES: SourceRecord[] = [
  {
    id: "src_churn",
    name: "churn-q3.csv",
    kindLabel: "Data",
    readLine: "churn-q3.csv, all 12,480 rows",
    syncedAt: "9:38 AM",
    icon: (
      <BarChart3Icon aria-hidden="true" />
    ),
  },
  {
    id: "src_webhook",
    name: "stripe-webhook.ts",
    kindLabel: "Repository",
    readLine: "stripe-webhook.ts, 214 lines",
    syncedAt: "9:41 AM",
    icon: (
      <CodeIcon aria-hidden="true" />
    ),
  },
  {
    id: "src_notes",
    name: "release-notes-3.4.md",
    kindLabel: "Docs",
    readLine: "release-notes-3.4.md, 4 sections",
    syncedAt: "10:02 AM",
    icon: (
      <FileTextIcon aria-hidden="true" />
    ),
  },
  {
    id: "src_research",
    name: "onboarding-research.md",
    kindLabel: "Research",
    readLine: "onboarding-research.md, 18 interviews",
    syncedAt: "10:02 AM",
    icon: (
      <BookOpenIcon aria-hidden="true" />
    ),
  },
]

// ---------- starter cards ----------

/** Emphasis lives in the data so the view only renders it, never rewrites it. */
export type CopySegment = { text: string; strong?: boolean }

export type StarterRecord = {
  id: string
  /** The card's whole label; the strong run carries the number that matters. */
  copy: CopySegment[]
  /** Sent verbatim, so each card lands on a real answer in REPLY_LIBRARY. */
  prompt: string
}

export const STARTERS: StarterRecord[] = [
  {
    id: "starter_churn",
    copy: [
      { text: "Read " },
      { text: "12,480 churn records", strong: true },
      { text: " and rank the plans losing the most accounts." },
    ],
    prompt: "Summarize Q3 churn by plan",
  },
  {
    id: "starter_webhook",
    copy: [
      { text: "Trace the " },
      { text: "charge.refunded 500s", strong: true },
      { text: " to the line in stripe-webhook.ts that throws." },
    ],
    prompt: "Why does stripe-webhook.ts 500 on charge.refunded?",
  },
  {
    id: "starter_research",
    copy: [
      { text: "Sit " },
      { text: "18 onboarding interviews", strong: true },
      { text: " next to the accounts that cancel first." },
    ],
    prompt: "What does onboarding-research.md say about setup?",
  },
]

// ---------- recent chats ----------

/** The switcher opens on this when nothing is loaded: the welcome state. */
export const NEW_CHAT_ID = "chat_new"

export type ChatRecord = {
  id: string
  title: string
  /** Replayed through draftReply on select, so no transcript is duplicated. */
  prompt: string
  updatedLabel: string
  recency: "today" | "earlier"
  pinned?: boolean
}

export const CHATS: ChatRecord[] = [
  {
    id: "chat_churn",
    title: "Q3 Churn By Plan",
    prompt: "Summarize Q3 churn by plan",
    updatedLabel: "9:12 AM",
    recency: "today",
    pinned: true,
  },
  {
    id: "chat_webhook",
    title: "Refund Webhook 500s",
    prompt: "Why does stripe-webhook.ts 500 on charge.refunded?",
    updatedLabel: "8:47 AM",
    recency: "today",
    pinned: true,
  },
  {
    id: "chat_cohorts",
    title: "Starter Cohorts",
    prompt: "Break Starter down by signup month",
    updatedLabel: "8:20 AM",
    recency: "today",
  },
  {
    id: "chat_notes",
    title: "3.4 Release Blockers",
    prompt: "What still blocks the 3.4 release notes?",
    updatedLabel: "Tue",
    recency: "earlier",
  },
  {
    id: "chat_offer",
    title: "Starter Save Offer",
    prompt: "Draft a save offer for Starter",
    updatedLabel: "Mon",
    recency: "earlier",
  },
  {
    id: "chat_onboarding",
    title: "Onboarding Stalls",
    prompt: "What does onboarding-research.md say about setup?",
    updatedLabel: "Mon",
    recency: "earlier",
  },
]

// ---------- transcript ----------

export type TableColumn = {
  key: string
  label: string
  /** Right aligns the column and puts its digits on tabular-nums. */
  numeric?: boolean
  /** Summed into the footer. A median or a rate must never be totalled. */
  total?: boolean
  /** Renders the cell through STATUS_BADGE instead of as plain text. */
  badge?: boolean
}

export type TableRowRecord = Record<string, string | number>

/** One bar in a comparison. `value` is read against the part's own `max`, so
    the bar is a real proportion rather than a length relative to its neighbours. */
export type MetricRecord = {
  label: string
  value: number
  /** What the row reads as: the raw number rarely carries its own unit. */
  display: string
  /** The row the surrounding sentence is pointing at. */
  lead?: boolean
}

export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "code"; language: string; filename: string; code: string }
  | {
      kind: "table"
      /** Names what one row counts, so the footer total has a unit. */
      caption: string
      columns: TableColumn[]
      rows: TableRowRecord[]
    }
  | {
      kind: "metrics"
      caption: string
      /** The denominator every bar is drawn and announced against. */
      max: number
      items: MetricRecord[]
    }

/** A turn's prompt text. Only a user turn carries one, and it is always the
    first part, but the reply union has to be narrowed to read it. */
export function askText(message: ChatMessageRecord) {
  const first = message.parts[0]
  return first && first.kind === "text" ? first.text : ""
}

export type ChatMessageRecord = {
  id: string
  role: "user" | "assistant"
  at: string
  parts: MessagePart[]
  /** Assistant turns carry the model that produced them. */
  modelId?: string
  /** User turns carry the sources in scope at send time. */
  contextIds?: string[]
  /** Next turns this reply invites. Only the newest reply's are shown. */
  followUps?: string[]
}

// ---------- reply pool ----------

export type ReplyDraft = {
  /** The step the activity marker names while the reply is prepared. */
  activity: string
  parts: MessagePart[]
  followUps?: string[]
}

type ReplyEntry = {
  match: string[]
  /** The file the answer leans on; the marker names it while reading. */
  sourceId: string
  /** Regenerate walks these, so a rerun is genuinely a different answer, and
      often a different shape: the churn ask answers as a table, then as bars. */
  variants: { body: MessagePart[]; followUps?: string[] }[]
}

/** One typed state map for every badged table cell, so a status is never a
    bare word and never a colour on its own. */
export const STATUS_BADGE: Record<
  string,
  { variant: "success-light" | "warning-light" | "secondary"; label: string }
> = {
  shipped: { variant: "success-light", label: "Shipped" },
  blocked: { variant: "warning-light", label: "Empty" },
  drafted: { variant: "secondary", label: "Drafted" },
}

const REPLY_LIBRARY: ReplyEntry[] = [
  {
    match: ["churn", "cancellation", "by plan"],
    sourceId: "src_churn",
    variants: [
      {
        body: [
          {
            kind: "text",
            text: "Q3 closed at 521 cancellations, and they are not spread evenly across the ladder.",
          },
          {
            kind: "table",
            caption: "Q3 cancellations by plan",
            columns: [
              { key: "plan", label: "Plan" },
              {
                key: "accounts",
                label: "Accounts",
                numeric: true,
                total: true,
              },
              {
                key: "cancelled",
                label: "Cancelled",
                numeric: true,
                total: true,
              },
              { key: "rate", label: "Rate", numeric: true },
            ],
            rows: [
              { plan: "Starter", accounts: 6240, cancelled: 418, rate: "6.7%" },
              { plan: "Growth", accounts: 4800, cancelled: 91, rate: "1.9%" },
              { plan: "Scale", accounts: 1440, cancelled: 12, rate: "0.8%" },
            ],
          },
          {
            kind: "text",
            text: "Starter is the whole story. It churns at three and a half times the Growth rate, and Scale is quiet. If you fix one funnel this quarter, fix Starter's.",
          },
        ],
        followUps: [
          "Break Starter down by signup month",
          "Draft a save offer for Starter",
        ],
      },
      {
        body: [
          {
            kind: "text",
            text: "Sliced by share instead of rate, the same 521 cancellations concentrate almost entirely on one plan.",
          },
          {
            kind: "metrics",
            caption: "Share of Q3 cancellations",
            max: 521,
            items: [
              {
                label: "Starter",
                value: 418,
                display: "418 · 80%",
                lead: true,
              },
              { label: "Growth", value: 91, display: "91 · 17%" },
              { label: "Scale", value: 12, display: "12 · 2%" },
            ],
          },
          {
            kind: "text",
            text: "Growth and Scale together lost 103 accounts, fewer than Starter loses in a slow month. The retention work belongs at the bottom of the ladder.",
          },
        ],
        followUps: [
          "Compare Q3 against Q2",
          "List the top cancellation reasons",
        ],
      },
    ],
  },
  {
    match: ["signup month", "starter down", "cohort"],
    sourceId: "src_churn",
    variants: [
      {
        body: [
          {
            kind: "text",
            text: "Starter churn splits hard by the month an account signed up.",
          },
          {
            kind: "metrics",
            caption: "Starter churn rate by signup month",
            max: 100,
            items: [
              {
                label: "June",
                value: 11.2,
                display: "11.2%",
                lead: true,
              },
              { label: "May", value: 7.4, display: "7.4%" },
              { label: "April and earlier", value: 4.1, display: "4.1%" },
            ],
          },
          {
            kind: "text",
            text: "The newest cohorts drive the rate. That is an activation problem wearing a churn costume, and it points at onboarding rather than pricing.",
          },
        ],
        followUps: [
          "Draft a save offer for Starter",
          "What does onboarding-research.md say about setup?",
        ],
      },
    ],
  },
  {
    match: ["save offer"],
    sourceId: "src_churn",
    variants: [
      {
        body: [
          {
            kind: "text",
            text: "Draft offer: on cancel, Starter accounts younger than 90 days get one guided setup call plus 60 days of Growth features at their current price.",
          },
          {
            kind: "text",
            text: "It targets the June cohort, where 11.2 percent churn concentrates, and costs nothing for the 4.1 percent long tail that leaves for other reasons.",
          },
        ],
        followUps: ["Break Starter down by signup month"],
      },
    ],
  },
  {
    match: ["webhook", "500", "charge.refunded", "stripe"],
    sourceId: "src_webhook",
    variants: [
      {
        body: [
          {
            kind: "text",
            text: "The 500 on `charge.refunded` is a shape mismatch. The handler reads `event.data.object.invoice`, and a refund created from the Stripe dashboard arrives without one.",
          },
          {
            kind: "code",
            language: "json",
            filename: "charge.refunded, dashboard refund",
            code: `{
  "object": "charge",
  "invoice": null,
  "payment_intent": "pi_3QhK2mE8sZ",
  "amount_refunded": 4900
}`,
          },
          {
            kind: "text",
            text: "The uncaught TypeError falls through to the generic 500. Guard the null and fall back to `charge.payment_intent`; the retry queue clears itself once the handler stops throwing.",
          },
        ],
        followUps: ["Draft the guard clause", "Which refunds hit the bug?"],
      },
      {
        body: [
          {
            kind: "text",
            text: "Same file, shorter version: dashboard refunds ship no `invoice` on the charge, API refunds do. The handler assumes the API shape on line 141 and dies on the other one.",
          },
          {
            kind: "text",
            text: "One null check fixes both paths, and the 41 queued events from Aug 19 replay cleanly after it.",
          },
        ],
        followUps: ["Draft the guard clause"],
      },
    ],
  },
  {
    match: ["guard clause", "null check"],
    sourceId: "src_webhook",
    variants: [
      {
        body: [
          {
            kind: "text",
            text: "Resolve the invoice defensively, before the refund is recorded.",
          },
          {
            kind: "code",
            language: "ts",
            filename: "stripe-webhook.ts",
            code: `async function resolveInvoice(charge: Stripe.Charge) {
  if (charge.invoice) return charge.invoice

  // Dashboard refunds carry no invoice, so walk back through the intent.
  if (!charge.payment_intent) {
    throw new UnknownChargeShapeError(charge.id)
  }

  const intent = await stripe.paymentIntents.retrieve(
    String(charge.payment_intent)
  )

  return intent.invoice ?? null
}`,
          },
          {
            kind: "text",
            text: "Keep the 500 for genuinely unknown shapes. A silent success on bad input is how the queue backs up without an alarm.",
          },
        ],
        followUps: ["Why does stripe-webhook.ts 500 on charge.refunded?"],
      },
    ],
  },
  {
    match: ["3.4", "release notes", "what changed", "blocks the"],
    sourceId: "src_notes",
    variants: [
      {
        body: [
          {
            kind: "text",
            text: "3.4 is a reliability release. Three of its four sections are written.",
          },
          {
            kind: "table",
            caption: "Release notes 3.4, section status",
            columns: [
              { key: "section", label: "Section" },
              { key: "detail", label: "What it covers" },
              { key: "status", label: "Status", badge: true },
            ],
            rows: [
              {
                section: "SCIM sync",
                detail: "Group sync moved onto the user cycle",
                status: "shipped",
              },
              {
                section: "Refunds",
                detail: "Confirmations land within a minute",
                status: "shipped",
              },
              {
                section: "Exports",
                detail: "CSV above 50,000 rows finishes",
                status: "shipped",
              },
              {
                section: "Webhooks",
                detail: "Heading only, no body written",
                status: "blocked",
              },
            ],
          },
          {
            kind: "text",
            text: "The webhook section is the one customers will look for after the Aug 19 incident, and it is still an empty heading.",
          },
        ],
        followUps: [
          "Why does stripe-webhook.ts 500 on charge.refunded?",
          "Summarize Q3 churn by plan",
        ],
      },
    ],
  },
  {
    match: ["onboarding", "interviews", "setup"],
    sourceId: "src_research",
    variants: [
      {
        body: [
          {
            kind: "text",
            text: "18 interviews, one repeated stall: the invite step required a verified domain first.",
          },
          {
            kind: "metrics",
            caption: "How long admins set up alone",
            max: 18,
            items: [
              {
                label: "Over a week",
                value: 11,
                display: "11 of 18",
                lead: true,
              },
              { label: "Within a week", value: 4, display: "4 of 18" },
              { label: "Within a day", value: 3, display: "3 of 18" },
            ],
          },
          {
            kind: "text",
            text: "The research reads like the churn data. New Starter teams that never invited a second person are the ones cancelling in their first quarter.",
          },
        ],
        followUps: [
          "Summarize Q3 churn by plan",
          "Break Starter down by signup month",
        ],
      },
    ],
  },
]

const FALLBACKS: string[][] = [
  [
    "Nothing in the connected sources covers that yet. Point me at a file, or connect the one that holds the answer, and I will read it before I guess.",
  ],
  [
    "That reaches past what I can see. The four sources cover the webhook, Q3 churn, the 3.4 notes and the onboarding research; anything else needs a new connection.",
  ],
]

function sourceName(id: string) {
  const hit = SOURCES.find((source) => source.id === id)
  return hit ? hit.name : id
}

/** "Read churn-q3.csv, all 12,480 rows" or the same plus how many rode along. */
function openingLine(primaryId: string, scopeIds: string[]) {
  const primary = SOURCES.find((source) => source.id === primaryId)
  if (!primary) return "Read the connected sources."
  const others = scopeIds.filter((id) => id !== primaryId)
  if (others.length === 0) return `Read ${primary.readLine}.`
  if (others.length === 1)
    return `Read ${primary.readLine}, plus ${sourceName(others[0])}.`
  return `Read ${primary.readLine}, plus ${others.length} more sources.`
}

/**
 * The grounded demo answer: an ask whose file is out of scope names the miss
 * instead of guessing, and `variant` rotates on Regenerate so a rerun differs.
 */
export function draftReply(
  prompt: string,
  scopeIds: string[],
  variant = 0
): ReplyDraft {
  const needle = prompt.toLowerCase()
  const entry = REPLY_LIBRARY.find((item) =>
    item.match.some((term) => needle.includes(term))
  )

  if (!entry) {
    const body = FALLBACKS[variant % FALLBACKS.length]
    return {
      activity: "Checking the connected sources",
      parts: body.map((text) => ({ kind: "text" as const, text })),
    }
  }

  if (!scopeIds.includes(entry.sourceId)) {
    const missing = sourceName(entry.sourceId)
    return {
      activity: "Checking the sources in scope",
      parts: [
        {
          kind: "text",
          text: `That answer lives in ${missing}, and you have it switched off for this chat. I would rather name the gap than guess around it.`,
        },
        {
          kind: "text",
          text: `Turn ${missing} back on and ask again, and I will read it before I answer.`,
        },
      ],
      followUps: [`Include ${missing} and rerun`],
    }
  }

  const pick = entry.variants[variant % entry.variants.length]
  return {
    activity: `Reading ${sourceName(entry.sourceId)}`,
    parts: [
      { kind: "text", text: openingLine(entry.sourceId, scopeIds) },
      ...pick.body,
    ],
    followUps: pick.followUps,
  }
}