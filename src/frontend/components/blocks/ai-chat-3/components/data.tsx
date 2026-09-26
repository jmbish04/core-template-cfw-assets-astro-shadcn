import type { ReactNode } from "react"
import { CodeIcon, PencilIcon, BarChart3Icon, RouteIcon, FileTextIcon, MessageSquareIcon, DatabaseIcon, UsersIcon, ActivityIcon, MailIcon, ShieldCheckIcon } from "lucide-react"

/** Base for a per turn permalink. Point it at your real thread route. */
export const THREAD_LINK_BASE = "https://halcyon.app/chat/"

export const ASSISTANT_NAME = "ReUI Chat"

export type ModelRecord = {
  id: string
  name: string
  provider: string
  /** Context window, unit free so the view owns the label. */
  context: string
  /** Called out in the picker as the default for most work. */
  recommended?: boolean
}

export const MODELS: ModelRecord[] = [
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    context: "200K",
    recommended: true,
  },
  {
    id: "gpt-5-1",
    name: "GPT-5.1",
    provider: "OpenAI",
    context: "256K",
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    context: "1M",
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral",
    context: "128K",
  },
]

export type PersonRecord = {
  name: string
  initials: string
  avatar: string
}

/** The person the greeting is written for. */
export const VIEWER: PersonRecord = {
  name: "Maya Chen",
  initials: "MC",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
}

/** The greeting only earns its place by naming what this workspace is doing. */
export const GREETING = {
  title: "Morning, Maya",
  /** Live numbers under the greeting. Each one is a starter row's payoff. */
  stats: ["Release 3.4 ships Thursday", "41 events queued", "3 sections empty"],
}

export type StarterRecord = {
  id: string
  /** Dropped into the composer verbatim, so it reads as something you typed. */
  prompt: string
  /** CONTEXT_SOURCES id attached on click: the row names what it will read. */
  contextId: string
  /** What is waiting inside that source, right aligned on the row. */
  count: string
  icon: ReactNode
}

export const STARTERS: StarterRecord[] = [
  {
    id: "webhook",
    prompt: "Explain the webhook 500s",
    contextId: "thread",
    count: "41 events",
    icon: (
      <CodeIcon aria-hidden="true" />
    ),
  },
  {
    id: "release-notes",
    prompt: "Draft Q3 release notes",
    contextId: "doc",
    count: "3 sections",
    icon: (
      <PencilIcon aria-hidden="true" />
    ),
  },
  {
    id: "churn",
    prompt: "Summarize churn by plan",
    contextId: "dataset",
    count: "521 cancellations",
    icon: (
      <BarChart3Icon aria-hidden="true" />
    ),
  },
  {
    id: "onboarding",
    prompt: "Plan the onboarding revamp",
    contextId: "research",
    count: "18 interviews",
    icon: (
      <RouteIcon aria-hidden="true" />
    ),
  },
]

export type ContextSource = {
  id: string
  /** Menu wording, so it reads as an action before it is attached. */
  label: string
  hint: string
  /** Chip wording, so it reads as a thing once it is attached. */
  chip: string
  meta: string
  icon: ReactNode
}

/** What the composer's plus menu can pull in. Each pick becomes one chip. */
export const CONTEXT_SOURCES: ContextSource[] = [
  {
    id: "doc",
    label: "Attach a document",
    hint: "Drafts in this workspace",
    chip: "release-notes-3.4.md",
    meta: "Document",
    icon: (
      <FileTextIcon aria-hidden="true" />
    ),
  },
  {
    id: "thread",
    label: "Link a thread",
    hint: "Incidents and issues",
    chip: "th_9f2k4m",
    meta: "Incident thread",
    icon: (
      <MessageSquareIcon aria-hidden="true" />
    ),
  },
  {
    id: "table",
    label: "Query a table",
    hint: "Read only access",
    chip: "events",
    meta: "Postgres table",
    icon: (
      <DatabaseIcon aria-hidden="true" />
    ),
  },
  {
    id: "dataset",
    label: "Attach a dataset",
    hint: "CSV exports",
    chip: "churn-q3.csv",
    meta: "CSV, 12,480 rows",
    icon: (
      <BarChart3Icon aria-hidden="true" />
    ),
  },
  {
    id: "research",
    label: "Attach research",
    hint: "Interview notes",
    chip: "onboarding-research.md",
    meta: "18 interviews",
    icon: (
      <UsersIcon aria-hidden="true" />
    ),
  },
]

/**
 * Cycled in the empty composer. The first one is the resting label, so the
 * field still reads as "Ask anything" before any motion starts.
 */
export const PLACEHOLDER_PROMPTS = [
  "Ask anything",
  "Explain the webhook 500s",
  "Draft the 3.4 release notes",
  "Summarize churn by plan",
  "Which numbers need verifying?",
  "Plan the onboarding revamp",
]

export type EffortRecord = {
  id: string
  label: string
  hint: string
  /** Milliseconds of plan step this mode buys before the answer arrives. */
  planMs: number
}

/** Reasoning modes. The plan step is real: it delays the first token. */
export const EFFORTS: EffortRecord[] = [
  { id: "instant", label: "Instant", hint: "Answers straight away", planMs: 0 },
  {
    id: "extended",
    label: "Extended",
    hint: "Plans before it answers",
    planMs: 900,
  },
  {
    id: "deep",
    label: "Deep",
    hint: "Reads every source first",
    planMs: 1800,
  },
]

export type QuestionnaireChoiceRecord = {
  value: string
  label: string
  hint?: string
}

export type QuestionnaireQuestion = {
  /** Doubles as the form field name, so the answer lands under this key. */
  name: string
  title: string
  description: string
  choices: QuestionnaireChoiceRecord[]
  multiple?: boolean
  required?: boolean
  /** Adds a free text option under the choices for this question. */
  input?: { label: string; placeholder: string }
}

export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "code"; language: string; code: string; filename?: string }
  | { kind: "file"; name: string; meta: string }
  | {
      kind: "table"
      caption: string
      columns: string[]
      rows: string[][]
    }
  | {
      kind: "questionnaire"
      /** Shown once the reader submits, ahead of the summary of answers. */
      lead: string
      questions: QuestionnaireQuestion[]
    }

export type ChatMessageRecord = {
  id: string
  role: "user" | "assistant"
  at: string
  parts: MessagePart[]
  /** Steps the reply planned before answering. Empty on Instant. */
  reasoning?: string[]
  /** Context sources that rode along with the turn, by CONTEXT_SOURCES id. */
  contextIds?: string[]
}

export type ThreadRecord = {
  id: string
  title: string
  /** Last activity, shown on the resume card. */
  at: string
  /** What the thread produced or reads, chipped on its card. */
  artifact: string
  /** One line of where the thread got to, so a card is worth resuming. */
  summary: string
  /** Labels the top of the scrollback once the thread is open. */
  separator: string
  icon: ReactNode
  messages: ChatMessageRecord[]
}

const LATENCY_THREAD: ThreadRecord = {
  id: "th_77de31",
  title: "p95 latency on eu-west",
  at: "22m",
  artifact: "eu-west replica",
  summary: "Index never reached the replica, p95 190 to 405ms.",
  separator: "Today",
  icon: (
    <ActivityIcon aria-hidden="true" />
  ),
  messages: [
    {
      id: "l_01",
      role: "user",
      at: "08:52",
      parts: [
        {
          kind: "text",
          text: "berlin account says the audit log page hangs. same latency thing from yesterday?",
        },
      ],
    },
    {
      id: "l_02",
      role: "assistant",
      at: "08:53",
      parts: [
        {
          kind: "text",
          text: "Same thing. p95 on eu-west went from 190 ms to 405 ms between 13:50 and 14:10, all of it in `GET /v1/audit-events`.\n\n`events_workspace_created_idx` was built on primary and never on the eu-west replica, so the planner there scans 94 GB per request. Berlin routes to eu-west, so that account sees it on every load and us-east sees nothing.",
        },
      ],
    },
    {
      id: "l_03",
      role: "user",
      at: "08:55",
      parts: [
        { kind: "text", text: "how long to fix, and does it lock reads" },
      ],
    },
    {
      id: "l_04",
      role: "assistant",
      at: "08:56",
      parts: [
        {
          kind: "text",
          text: "About 40 minutes to build, and no. It goes up concurrently, so reads keep serving off the sequential scan until the index is live. Jonas has it queued to run next, starting around 11:00.",
        },
      ],
    },
  ],
}

const TRIAL_EMAIL_THREAD: ThreadRecord = {
  id: "th_e3806b",
  title: "Trial expiry email rewrite",
  at: "Yesterday",
  artifact: "trial-expiry.txt",
  summary: "Subject renamed, the closing line stays.",
  separator: "Yesterday",
  icon: (
    <MailIcon aria-hidden="true" />
  ),
  messages: [
    {
      id: "t_01",
      role: "user",
      at: "11:02",
      parts: [
        {
          kind: "text",
          text: "trial expiry email reads like a warning. lead with what they built instead",
        },
      ],
    },
    {
      id: "t_02",
      role: "assistant",
      at: "11:03",
      parts: [
        {
          kind: "text",
          text: "Reframed around the work, with the deadline demoted to one line. Merge fields in braces:",
        },
        {
          kind: "code",
          language: "text",
          filename: "trial-expiry.txt",
          code: "Subject: Your {workspace_name} trial ends {expiry_date}\n\n{first_name}, you have built {view_count} saved views and\nbrought in {teammate_count} teammates.\n\nAll of it stays exactly where you left it.\n\nKeep going any time.",
        },
      ],
    },
    {
      id: "t_03",
      role: "user",
      at: "11:09",
      parts: [
        {
          kind: "text",
          text: "better. the subject still leads with the deadline though",
        },
      ],
    },
    {
      id: "t_04",
      role: "assistant",
      at: "11:10",
      parts: [
        {
          kind: "text",
          text: "Renamed it to `Your {workspace_name} work is saved` and moved the end date into the first body line, so the subject sells the work and the date reads as information instead of pressure. trial-expiry.txt is updated.",
        },
      ],
    },
  ],
}

const AUDIT_EXPORT_THREAD: ThreadRecord = {
  id: "th_9d40b7",
  title: "Audit log export scope",
  at: "Tue",
  artifact: "audit-export.csv",
  summary: "Scope covers member reads inside their own workspace.",
  separator: "Tuesday",
  icon: (
    <ShieldCheckIcon aria-hidden="true" />
  ),
  messages: [
    {
      id: "a_01",
      role: "user",
      at: "11:20",
      parts: [
        {
          kind: "text",
          text: "enterprise asked what the audit log export actually includes",
        },
      ],
    },
    {
      id: "a_02",
      role: "assistant",
      at: "11:21",
      parts: [
        {
          kind: "text",
          text: "Every write, plus admin reads of member and billing records. Each row carries actor, action, target, IP and a request id, and 3.4 raises Enterprise retention to 400 days.\n\nWhat it leaves out is anything a member reads in their own workspace, which is the part that usually comes back as a follow up question.",
        },
      ],
    },
  ],
}

/** Recent work, newest first. The welcome screen resumes any of them. */
export const THREADS: ThreadRecord[] = [
  LATENCY_THREAD,
  TRIAL_EMAIL_THREAD,
  AUDIT_EXPORT_THREAD,
]

const WEBHOOK_CODE =
  "export async function handleRefund(event: Stripe.Event) {\n" +
  "  const charge = event.data.object as Stripe.Charge\n" +
  "  const intent = charge.payment_intent\n" +
  "\n" +
  "  // Dashboard refunds carry no intent, so this threw\n" +
  "  return confirmRefund(intent.id, charge.amount_refunded)\n" +
  "}"

type ReplyRecord = {
  match: string[]
  /** Named in the thinking Marker while the reply is on its way. */
  activity: string
  /** The plan the reply worked to, revealed only when effort buys one. */
  reasoning?: string[]
  parts: MessagePart[]
}

/** Keyed on the terms the starters use, so a send always gets a real answer. */
/** The scoping questions the onboarding reply asks before it writes a plan. */
const ONBOARDING_SCOPE: QuestionnaireQuestion[] = [
  {
    name: "scope",
    title: "Which step should the revamp change?",
    description: "Pick the one the interviews point at, or name another.",
    required: true,
    input: {
      label: "Another step",
      placeholder: "Name another step",
    },
    choices: [
      {
        value: "connect",
        label: "Data source connect",
        hint: "12 of 18 stalled here, 9 waiting on credentials.",
      },
      {
        value: "invite",
        label: "Teammate invite",
        hint: "Unblocks the 9 who needed someone else.",
      },
      {
        value: "whole-flow",
        label: "The whole flow",
        hint: "Five screens, and the research does not ask for it.",
      },
    ],
  },
  {
    name: "measures",
    title: "What should the plan commit to moving?",
    description: "Select every number the work has to answer for.",
    multiple: true,
    choices: [
      { value: "activation", label: "Activation rate" },
      { value: "time-to-first-sync", label: "Time to first sync" },
      { value: "support-tickets", label: "Setup tickets" },
      { value: "invite-accepts", label: "Invite accepts" },
    ],
  },
  {
    name: "timing",
    title: "When does this land?",
    description: "The 3.4 freeze holds until Thursday.",
    required: true,
    choices: [
      { value: "after-freeze", label: "Right after the freeze" },
      { value: "3-5", label: "In the 3.5 cycle" },
      { value: "backlog", label: "Backlog it for now" },
    ],
  },
]

const REPLY_LIBRARY: ReplyRecord[] = [
  {
    match: ["webhook", "500", "refund"],
    activity: "Reading th_9f2k4m",
    reasoning: [
      "Pulled the 41 queued events off th_9f2k4m and grouped them by error.",
      "All 41 share one stack frame, so this is one bug and not a class of them.",
      "Checked the handler against the Stripe payload: the null guard runs late.",
    ],
    parts: [
      {
        kind: "text",
        text: "One line. `charge.payment_intent` is null on refunds issued from the Stripe dashboard, and the handler dereferences it before the null check:",
      },
      {
        kind: "code",
        language: "typescript",
        filename: "stripe-webhook.ts",
        code: WEBHOOK_CODE,
      },
      {
        kind: "text",
        text: "The patch falls back to the charge id when `payment_intent` is missing, and the replay has delivered 39 of the 41 queued confirmations so far. The last 2 are past Stripe's 3 day retry window, so they need a manual resend from the Dashboard.",
      },
    ],
  },
  {
    match: ["release notes", "q3", "3.4"],
    activity: "Reading release-notes-3.4.md",
    reasoning: [
      "Read the 3.4 changelog and split internal work from customer facing work.",
      "Three changes reach a customer; the rest are migrations and tooling.",
      "Checked the draft: all three sections are still empty.",
    ],
    parts: [
      {
        kind: "text",
        text: "Three customer facing changes, and the draft is missing all three. Here is the Highlights section:",
      },
      {
        kind: "code",
        language: "markdown",
        filename: "release-notes-3.4.md",
        code: "## Highlights\n\nGroup sync now runs on the user sync schedule, so\nmembership stops drifting between full syncs.\n\nRefund confirmations now arrive within a minute\nof the refund being issued.\n\nCSV exports above 50,000 rows finish at the gateway\ninstead of timing out.\n",
      },
      {
        kind: "text",
        text: "The rest of 3.4 is internal and does not belong in these notes. Which section do you want written next?",
      },
      { kind: "file", name: "release-notes-3.4.md", meta: "Markdown, 4 KB" },
    ],
  },
  {
    match: ["churn", "plan tier", "cancel"],
    activity: "Querying churn-q3.csv",
    reasoning: [
      "Grouped all 521 cancellations by plan and divided by accounts on each.",
      "Starter carries 418 of them, so the rate gap is real and not a volume effect.",
      "Checked days to cancel: the Starter median lands just past the second invoice.",
    ],
    parts: [
      {
        kind: "text",
        text: "Starter, by a wide margin. 418 of 521 cancellations last quarter came from the 6,240 Starter accounts:",
      },
      {
        kind: "table",
        caption: "Cancellations by plan, Q3",
        columns: ["Plan", "Accounts", "Cancels", "Rate"],
        rows: [
          ["Starter", "6,240", "418", "6.7%"],
          ["Growth", "4,800", "91", "1.9%"],
          ["Scale", "1,440", "12", "0.8%"],
        ],
      },
      {
        kind: "text",
        text: "The median Starter cancellation lands 41 days in, which is just past the second invoice. Growth and Scale cancellations cluster at renewal instead.",
      },
      { kind: "file", name: "churn-q3-by-plan.csv", meta: "CSV, 12 KB" },
    ],
  },
  {
    match: ["onboarding", "revamp", "activation"],
    activity: "Reading onboarding-research.md",
    reasoning: [
      "Read all 18 interviews and tagged where each one stalled.",
      "12 of 18 stall at the same screen, which makes this a step problem.",
      "9 of those 12 were blocked on another person, not on the form.",
    ],
    parts: [
      {
        kind: "text",
        text: "The 18 interviews point at one step, not the whole flow. 12 of 18 stalled at the data source connect screen, and 9 of those were waiting on someone else for credentials.\n\nThree calls decide the shape of the plan, so answer these and I will write it against your answers.",
      },
      {
        kind: "questionnaire",
        lead: "Plan written against your answers.",
        questions: ONBOARDING_SCOPE,
      },
    ],
  },
  {
    match: ["latency", "p95", "eu-west", "index"],
    activity: "Checking eu-west metrics",
    parts: [
      {
        kind: "text",
        text: "Still queued. Jonas starts the index build around 11:00, and p95 on eu-west should fall back under 200 ms within an hour of it going live. This is the query behind that number:",
      },
      {
        kind: "code",
        language: "sql",
        filename: "p95-by-region.sql",
        code: "select region,\n       percentile_cont(0.95) within group (order by ms) as p95\nfrom request_latency\nwhere at >= now() - interval '24 hours'\ngroup by region\norder by p95 desc;",
      },
    ],
  },
]

const FALLBACK_REPLIES: ReplyRecord[] = [
  {
    match: [],
    activity: "Searching this workspace",
    parts: [
      {
        kind: "text",
        text: "Nothing in the 3.4 tickets covers that yet. Point me at the issue or the incident thread and I will pull the detail into whichever section you want.",
      },
    ],
  },
  {
    match: [],
    activity: "Checking the release scope",
    parts: [
      {
        kind: "text",
        text: "One constraint first: the 3.4 freeze holds until Thursday, so anything that names new behavior ships in the 3.5 notes instead. Do you want it drafted against 3.5?",
      },
    ],
  },
  {
    match: [],
    activity: "Reading the thread",
    parts: [
      {
        kind: "text",
        text: "I can answer that from either the incident thread or the export tickets, and they disagree on the timeline. Which one should win?",
      },
    ],
  },
]

/** Repeat sends rotate the fallback, so the demo never answers twice alike. */
/**
 * Writes the plan back from what was actually chosen, so the answers change
 * the reply rather than decorating it.
 */
export function planFromScope(answers: { title: string; values: string[] }[]) {
  const [step, measures, timing] = answers
  const target = step?.values[0] ?? "the connect step"
  const moved = measures?.values.length
    ? measures.values.join(" and ")
    : "no number yet"
  const when = timing?.values[0] ?? "an unscheduled slot"

  return `Scoped to ${target}, answering for ${moved}, landing ${when.toLowerCase()}.\n\nTwo screens and a reminder job: a skip path that lets setup continue without credentials, and a resumable invite that reopens where the invited teammate left off. Nothing else in the flow changes.\n\nThe risk is the reminder job. If it fires before the invite is accepted it reads as nagging, so it waits a full day and stops after two.`
}

export function draftReply(prompt: string, turn = 0) {
  const needle = prompt.toLowerCase()
  const hit = REPLY_LIBRARY.find((entry) =>
    entry.match.some((term) => needle.includes(term))
  )
  return hit ?? FALLBACK_REPLIES[turn % FALLBACK_REPLIES.length]
}