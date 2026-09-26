import type { ReactNode } from "react"

import { AnthropicBlack } from "@/components/ui/svgs/anthropicBlack"
import { AnthropicWhite } from "@/components/ui/svgs/anthropicWhite"
import { Gemini } from "@/components/ui/svgs/gemini"
import { Openai } from "@/components/ui/svgs/openai"
import { OpenaiDark } from "@/components/ui/svgs/openaiDark"
import { CodeIcon, DatabaseIcon, GlobeIcon } from "lucide-react"

export const ASSISTANT_NAME = "Nimbus"

/** Transcript spacing, set from the header settings menu. */
export type Density = "comfortable" | "compact"

/** Every timestamp in the thread is relative to this, so the demo never drifts. */
export const REFERENCE_TIME = "14:52"

// ---------- models ----------

export type ModelRecord = {
  id: string
  name: string
  provider: string
  /** Shown in the picker so the choice reads as a capability, not a label. */
  context: string
  logo: ReactNode
}

/** Paired marks swap per theme; the stage forces dark, so the light half wins. */
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

export const MODELS: ModelRecord[] = [
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    context: "200K context",
    logo: ANTHROPIC_MARK,
  },
  {
    id: "gpt-5-1",
    name: "GPT-5.1",
    provider: "OpenAI",
    context: "256K context",
    logo: OPENAI_MARK,
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    context: "1M context",
    logo: GEMINI_MARK,
  },
]

// ---------- threads ----------

export type ThreadRecord = {
  id: string
  title: string
  group: string
  at: string
  /** Heads the transcript, so a Tuesday thread never reads "Today". */
  dateLabel: string
  /** A run still working, so the switcher row carries a live dot. */
  live?: boolean
}

export const THREADS: ThreadRecord[] = [
  {
    id: "th_9f2k4m",
    title: "Stripe webhook 500s on charge.refunded",
    group: "Today",
    at: "14:52",
    dateLabel: "Today",
    live: true,
  },
  {
    id: "th_4c8p1x",
    title: "Retry budget alerting",
    group: "Today",
    at: "11:06",
    dateLabel: "Today",
  },
  {
    id: "th_2d7v9b",
    title: "Q3 release notes draft",
    group: "Earlier",
    at: "Tue",
    dateLabel: "Tuesday",
  },
  {
    id: "th_6k3n0s",
    title: "Churn by plan tier",
    group: "Earlier",
    at: "Mon",
    dateLabel: "Monday",
  },
]

// ---------- reply payloads ----------

export type StepState = "done" | "failed"

export type TraceStep = {
  id: string
  /** verb_noun, the shape a real tool registry uses. */
  tool: string
  artifact: string
  state: StepState
}

export type Figure = {
  id: string
  label: string
  value: string
  /** Ties the figure to a state colour, so a number can read as a warning. */
  tone: "neutral" | "warning" | "danger"
}

export type Payload =
  | { kind: "trace"; steps: TraceStep[] }
  | { kind: "metrics"; figures: Figure[] }
  | {
      kind: "patch"
      file: string
      language: string
      added: number
      removed: number
    }

// ---------- turns ----------

export type TurnState = "settled" | "streaming" | "stopped"

export type UserTurn = {
  id: string
  role: "user"
  text: string
  at: string
}

export type AssistantTurn = {
  id: string
  role: "assistant"
  state: TurnState
  modelId: string
  at: string
  /** Absent while streaming: neither number exists until the reply lands. */
  latency?: string
  tokens?: number
  text: string
  payload?: Payload
  /** Follow ups belong to this reply, so a stale chip can never surface. */
  replies?: string[]
}

export type TurnRecord = UserTurn | AssistantTurn

export const TURNS: TurnRecord[] = [
  {
    id: "t_01",
    role: "user",
    text: "charge.refunded is still 500ing after we shipped the retry fix. what is actually throwing",
    at: "14:44",
  },
  {
    id: "t_02",
    role: "assistant",
    state: "settled",
    modelId: "claude-sonnet-5",
    at: "14:44",
    latency: "4.2s",
    tokens: 2140,
    text: "The retry fix was never the problem. stripe-webhook.ts line 118 reads balance_transaction.fee before the null guard, and a refund on a disputed charge arrives with balance_transaction set to null. All three replays threw the same TypeError, so this is deterministic rather than a race.",
    payload: {
      kind: "trace",
      steps: [
        {
          id: "s_1",
          tool: "read_file",
          artifact: "stripe-webhook.ts:96-140",
          state: "done",
        },
        {
          id: "s_2",
          tool: "query_db",
          artifact: "webhook_events, 41 rows",
          state: "done",
        },
        {
          id: "s_3",
          tool: "run_code",
          artifact: "replay harness, 3 of 3 threw",
          state: "failed",
        },
      ],
    },
  },
  {
    id: "t_03",
    role: "user",
    text: "how bad is the backlog",
    at: "14:49",
  },
  {
    id: "t_04",
    role: "assistant",
    state: "settled",
    modelId: "claude-sonnet-5",
    at: "14:49",
    latency: "2.6s",
    tokens: 1315,
    text: "41 events are queued and 6 of the 50 retry attempts are left. Stripe stops redelivering at zero, so the oldest event drops in about 40 minutes. I have a patch ready that moves the guard above the dereference.",
    payload: {
      kind: "metrics",
      figures: [
        { id: "f_1", label: "Queued", value: "41", tone: "neutral" },
        { id: "f_2", label: "Retries left", value: "6 of 50", tone: "danger" },
        { id: "f_3", label: "Oldest event", value: "2h 14m", tone: "warning" },
      ],
    },
    replies: ["Show the patch", "Replay one event", "Restart the worker"],
  },
]

/** Every switcher row loads its own history, so no thread shows another's. */
export const TRANSCRIPTS: Record<string, TurnRecord[]> = {
  th_9f2k4m: TURNS,
  th_4c8p1x: [
    {
      id: "t_11",
      role: "user",
      text: "warn me before the retry budget drops under ten on any handler",
      at: "11:04",
    },
    {
      id: "t_12",
      role: "assistant",
      state: "settled",
      modelId: "gpt-5-1",
      at: "11:06",
      latency: "1.9s",
      tokens: 884,
      text: "Rule added on webhook_events. It evaluates every five minutes across all handlers and pages Jonas Weber, on call for billing, once attempts remaining falls under ten. Two handlers are inside that band right now.",
      payload: {
        kind: "trace",
        steps: [
          {
            id: "s_11",
            tool: "query_db",
            artifact: "webhook_events, 7 handlers",
            state: "done",
          },
          {
            id: "s_12",
            tool: "create_alert",
            artifact: "retry_budget_low",
            state: "done",
          },
        ],
      },
    },
  ],
  th_2d7v9b: [
    {
      id: "t_21",
      role: "user",
      text: "the 3.4 notes intro reads like a changelog, tighten it",
      at: "Tue",
    },
    {
      id: "t_22",
      role: "assistant",
      state: "settled",
      modelId: "claude-sonnet-5",
      at: "Tue",
      latency: "3.4s",
      tokens: 1976,
      text: "Rewrote the intro around the one change customers asked for, scheduled exports, and moved the eleven maintenance items into a collapsed list at the end. The section now opens on the outcome instead of the ticket numbers.",
      payload: {
        kind: "patch",
        file: "release-notes-3.4.md",
        language: "Markdown",
        added: 24,
        removed: 41,
      },
    },
  ],
  th_6k3n0s: [
    {
      id: "t_31",
      role: "user",
      text: "which plan tier lost the most seats last quarter",
      at: "Mon",
    },
    {
      id: "t_32",
      role: "assistant",
      state: "settled",
      modelId: "gemini-3-pro",
      at: "Mon",
      latency: "2.2s",
      tokens: 1104,
      text: "Team lost the most seats in absolute terms, but the rate tells a different story: Starter shed nearly a fifth of its base while Team stayed close to flat. Enterprise grew.",
      payload: {
        kind: "metrics",
        figures: [
          { id: "f_31", label: "Starter", value: "18.4%", tone: "danger" },
          { id: "f_32", label: "Team", value: "3.1%", tone: "warning" },
          { id: "f_33", label: "Enterprise", value: "+2.6%", tone: "neutral" },
        ],
      },
    },
  ],
}

/** Replies the composer streams in, cycled so two sends never read alike. */
export const PENDING_REPLIES = [
  {
    text: "Guard moved above the dereference and the fee now falls back to zero when Stripe omits the balance transaction. The replay harness passes all three fixtures, so the queued events will drain on the next redelivery.",
    latency: "3.1s",
    tokens: 1682,
    payload: {
      kind: "patch",
      file: "stripe-webhook.ts",
      language: "TypeScript",
      added: 12,
      removed: 4,
    },
    replies: ["Open the diff", "Restart the worker", "Draft the incident note"],
  },
  {
    text: "Worker restarted and the queue is draining. 34 of the 41 events have been acknowledged in the last two minutes and none have thrown, so the remaining seven should clear on the next sweep.",
    latency: "2.4s",
    tokens: 1128,
    payload: {
      kind: "metrics",
      figures: [
        { id: "f_p1", label: "Drained", value: "34 of 41", tone: "neutral" },
        { id: "f_p2", label: "Errors", value: "0", tone: "neutral" },
        {
          id: "f_p3",
          label: "Retries left",
          value: "6 of 50",
          tone: "warning",
        },
      ],
    },
    replies: ["Watch the queue", "Draft the incident note"],
  },
  {
    text: "Incident note drafted against the billing template. It names the null balance_transaction on disputed refunds as the cause, the 41 queued events as the blast radius, and the guard as the fix, with the replay evidence attached.",
    latency: "3.8s",
    tokens: 1944,
    payload: {
      kind: "trace",
      steps: [
        {
          id: "s_p1",
          tool: "read_file",
          artifact: "incident-template.md",
          state: "done",
        },
        {
          id: "s_p2",
          tool: "create_doc",
          artifact: "inc-2291-billing.md",
          state: "done",
        },
      ],
    },
    replies: ["Share with the team", "Open the diff"],
  },
] satisfies Omit<AssistantTurn, "id" | "role" | "state" | "modelId" | "at">[]

/** What the model is doing while the reply streams, one line per beat. */
export const THINKING_STEPS = [
  "Reading stripe-webhook.ts",
  "Running the replay harness",
  "Drafting the patch",
]

// ---------- scope ----------

export type SourceRecord = {
  id: string
  name: string
  icon: ReactNode
}

export const SOURCES: SourceRecord[] = [
  {
    id: "repo",
    name: "billing-service",
    icon: (
      <CodeIcon className="size-4" aria-hidden="true" />
    ),
  },
  {
    id: "events",
    name: "webhook_events",
    icon: (
      <DatabaseIcon className="size-4" aria-hidden="true" />
    ),
  },
  {
    id: "docs",
    name: "Stripe API docs",
    icon: (
      <GlobeIcon className="size-4" aria-hidden="true" />
    ),
  },
]

/** Starters for the zero state, phrased as the work rather than as a greeting. */
export const STARTERS = [
  "Summarize the last failed run",
  "Find every unguarded webhook handler",
  "Draft an incident note for billing",
]