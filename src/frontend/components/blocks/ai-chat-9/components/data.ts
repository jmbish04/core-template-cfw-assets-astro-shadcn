export type ModelRecord = {
  id: string
  name: string
  /** What a version chip on the fork rail says, so two Claudes stay apart. */
  short: string
  provider: string
  /** Context window, unit free so the view owns the label. */
  context: string
  /** Called out in the picker as the default for most work. */
  recommended?: boolean
}

/** Grouped by provider in menu order. Ids are stable: the seeded turns and
    every saved version reference them. */
export const MODELS: ModelRecord[] = [
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    short: "Sonnet 5",
    provider: "Anthropic",
    context: "200K",
    recommended: true,
  },
  {
    id: "claude-opus-5",
    name: "Claude Opus 5",
    short: "Opus 5",
    provider: "Anthropic",
    context: "200K",
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    short: "Haiku 4.5",
    provider: "Anthropic",
    context: "200K",
  },
  {
    id: "gpt-5-1",
    name: "GPT-5.1",
    short: "GPT-5.1",
    provider: "OpenAI",
    context: "256K",
  },
  {
    id: "gpt-5-1-mini",
    name: "GPT-5.1 Mini",
    short: "5.1 Mini",
    provider: "OpenAI",
    context: "256K",
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    short: "GPT-5",
    provider: "OpenAI",
    context: "128K",
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    short: "3 Pro",
    provider: "Google",
    context: "1M",
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    short: "3 Flash",
    provider: "Google",
    context: "1M",
  },
  {
    id: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    short: "2.5 Pro",
    provider: "Google",
    context: "2M",
  },
  {
    id: "mistral-large",
    name: "Mistral Large 2",
    short: "Large 2",
    provider: "Mistral",
    context: "128K",
  },
  {
    id: "mistral-small-3",
    name: "Mistral Small 3",
    short: "Small 3",
    provider: "Mistral",
    context: "128K",
  },
  {
    id: "codestral",
    name: "Codestral 25.08",
    short: "Codestral",
    provider: "Mistral",
    context: "256K",
  },
]

/** What the composer opens on, and what a Regenerate writes with by default. */
export const DEFAULT_MODEL_ID =
  MODELS.find((model) => model.recommended)?.id ?? MODELS[0].id

/** Provider order follows MODELS, so the picker never reshuffles itself. */
export const MODEL_PROVIDERS: { provider: string; models: ModelRecord[] }[] =
  MODELS.reduce<{ provider: string; models: ModelRecord[] }[]>(
    (groups, model) => {
      const group = groups.find((entry) => entry.provider === model.provider)
      if (group) group.models.push(model)
      else groups.push({ provider: model.provider, models: [model] })
      return groups
    },
    []
  )

/** The short name a version chip leads with. */
export function modelShortName(id: string) {
  return MODELS.find((model) => model.id === id)?.short ?? MODELS[0].short
}

export function modelName(id: string) {
  return MODELS.find((model) => model.id === id)?.name ?? MODELS[0].name
}

function modelIndex(id: string) {
  const found = MODELS.findIndex((model) => model.id === id)
  return found < 0 ? 0 : found
}

export type PersonRecord = {
  name: string
}

/** The person typing in the thread. A bare thread shows no portrait. */
export const VIEWER: PersonRecord = {
  name: "Maya Chen",
}

export const ASSISTANT_NAME = "ReUI Chat"

export const DOC_FILENAME = "release-notes-3.4.md"

/** Where an overflow Copy link points. Swap for your own thread route. */
export const THREAD_URL = "https://chat.halcyon.dev/t/"

export type SourceRecord = {
  id: string
  title: string
  /** Picks the row glyph, so a thread never reads as a file. */
  kind: "doc" | "thread" | "tickets" | "data"
  /** One clause of provenance: where it came from, or how much of it there is. */
  meta: string
}

/** The library a reply can cite. A turn lists the ids it actually read. */
export const SOURCES: Record<string, SourceRecord> = {
  notes34: {
    id: "notes34",
    title: DOC_FILENAME,
    kind: "doc",
    meta: "Draft, edited 14m ago",
  },
  notes33: {
    id: "notes33",
    title: "release-notes-3.3.md",
    kind: "doc",
    meta: "Published Jul 30",
  },
  incident: {
    id: "incident",
    title: "Aug 19 incident thread",
    kind: "thread",
    meta: "41 held confirmations",
  },
  tickets: {
    id: "tickets",
    title: "EXP-412 to EXP-424",
    kind: "tickets",
    meta: "12 filed since 3.3",
  },
  plans: {
    id: "plans",
    title: "Enterprise plan page",
    kind: "doc",
    meta: "400 day audit history",
  },
  manifest: {
    id: "manifest",
    title: "changelog-3.4.yaml",
    kind: "data",
    meta: "3 user facing changes",
  },
  churn: {
    id: "churn",
    title: "churn-q3.csv",
    kind: "data",
    meta: "18,400 rows",
  },
}

/** Resolves cited ids in order, so [1] is always the first row on screen. */
export function sourceList(ids: string[] | undefined) {
  return (ids ?? []).flatMap((id) => (SOURCES[id] ? [SOURCES[id]] : []))
}

/** What the model worked through before it answered, behind a disclosure. */
export type ReasoningRecord = {
  /** Printed on the closed row, so the wait has a number against it. */
  seconds: number
  steps: string[]
}

/** Markdown source is hard wrapped, the way a checked in .md file is. 44
    columns keeps the block inside a 420 wide viewport without clipping. */
const MARKDOWN_COLUMNS = 44

function hardWrap(text: string) {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word
    if (next.length > MARKDOWN_COLUMNS && line) {
      lines.push(line)
      line = word
      continue
    }
    line = next
  }
  if (line) lines.push(line)
  return lines.join("\n")
}

export type MessagePart =
  /** Inline markup the body understands, with no markdown dependency:
      `code`, **bold**, and [1] citations into the turn's own sources. */
  | { kind: "text"; text: string }
  /** A section title inside a reply. Lands whole, never typed out. */
  | { kind: "heading"; text: string }
  /** Items land one at a time, so a half written bullet never shows. */
  | { kind: "list"; ordered?: true; items: string[] }
  | {
      kind: "code"
      language: string
      code: string
      filename?: string
      /** 1 indexed lines the primitive marks in the diff gutter. */
      diff?: { added?: number[]; removed?: number[] }
    }

/** One take on the opening paragraph: what the reply says, and what it ships. */
type OpenerDraft = {
  opener: string
  paragraphs: string[]
  /** The line after the block, where the model argues for its choice. */
  note?: string
}

const SECTION_HEADING = "Highlights"

function openerMarkdown(paragraphs: string[]) {
  const body = paragraphs.map((paragraph) => hardWrap(paragraph)).join("\n\n")
  return `## ${SECTION_HEADING}\n\n${body}`
}

/** One draft becomes an opener, a markdown block and a closing line. */
function draftParts(draft: OpenerDraft): MessagePart[] {
  const parts: MessagePart[] = [
    { kind: "text", text: draft.opener },
    {
      kind: "code",
      language: "markdown",
      filename: DOC_FILENAME,
      code: openerMarkdown(draft.paragraphs),
    },
  ]
  if (draft.note) parts.push({ kind: "text", text: draft.note })
  return parts
}

/** Version 1: reliability as the through line. */
const RELIABILITY_DRAFT: OpenerDraft = {
  opener: "One paragraph, verb first, no component names:",
  paragraphs: [
    "3.4 is a reliability release. Refund confirmations reach your endpoint within a minute, group membership stays in step with your identity provider, and CSV exports finish at every size we accept.",
  ],
  note: "Reliability is the only thread all three changes share, so it carries the sentence.",
}

/** Version 2: what the reader gets, with the one figure worth printing. */
const ENUMERATED_DRAFT: OpenerDraft = {
  opener: "Same ask, framed as what a reader gets rather than what we shipped:",
  paragraphs: [
    "Three things get out of your way in 3.4. Refund confirmations arrive in under a minute instead of on the next queue drain. Group membership syncs on the user schedule, so access stops drifting between runs. CSV exports past 50,000 rows finish instead of timing out at the gateway.",
  ],
  note: "The row count is the only figure in it, and it comes from the export tickets, so it is safe to print.",
}

/** Version 3: names the complaint, not the fix. */
const OUTCOME_DRAFT: OpenerDraft = {
  opener: "Shorter, and it names the complaints rather than the fixes:",
  paragraphs: [
    "3.4 closes the three gaps support hears about most: late refund confirmations, stale group membership, and exports that stop at the gateway. No API and no pricing changes ship with it.",
  ],
  note: "The second sentence exists to stop the upgrade questions. Cut it if the notes never promise that elsewhere.",
}

/** The reply to the edited ask, where refunds lead. */
const REFUND_LED_DRAFT: OpenerDraft = {
  opener: "Refunds first, then the other two in one sentence:",
  paragraphs: [
    "Refund confirmations now reach your endpoint within a minute of the refund itself. 3.4 also brings group membership in line with your identity provider on every sync, and lifts the ceiling that stopped large CSV exports from finishing.",
  ],
  note: "Support gets its answer in the first line, which is the whole reason to lead with it.",
}

/** The trimmed draft, after the row count comes out. */
const NO_FIGURE_DRAFT: OpenerDraft = {
  opener: "Number out. The sentence still carries the change:",
  paragraphs: [
    "Three things get out of your way in 3.4. Refund confirmations arrive in under a minute instead of on the next queue drain. Group membership syncs on the user schedule, so access stops drifting between runs. Large CSV exports finish instead of timing out at the gateway.",
  ],
}

/** A second pass at the same trim, so a regenerate on that ask has a rival. */
const NO_FIGURE_ALT_DRAFT: OpenerDraft = {
  opener: "Same trim, tighter close:",
  paragraphs: [
    "Three waits end in 3.4. Refund confirmations reach your endpoint within a minute, group membership follows your identity provider on every sync, and CSV exports finish no matter how large the file runs.",
  ],
  note: "The size claim is qualitative now, so ops has no figure to argue with.",
}

/** A third trim, so a regenerate on the row count ask has somewhere to go
    that is neither seeded sibling. */
const NO_FIGURE_THIRD_DRAFT: OpenerDraft = {
  opener: "Once more, leading on the wait rather than the ceiling:",
  paragraphs: [
    "Nothing in 3.4 waits on a queue drain any more. Refund confirmations reach your endpoint within a minute, group membership follows your identity provider on every sync, and CSV exports run to the end of the file.",
  ],
  note: "It drops the comparison to 3.3 entirely, which is the shortest this paragraph gets.",
}

/** The trims a regenerate on that ask rotates through. The two seeded ones
    are already on screen as siblings, so neither is in here. */
const TRIM_DRAFTS: OpenerDraft[] = [NO_FIGURE_THIRD_DRAFT]

/**
 * What a fresh regenerate produces. Four takes so pressing it twice, or on
 * another model, never hands back the version already on screen.
 */
const REGENERATED_DRAFTS: OpenerDraft[] = [
  {
    opener: "Another pass. This one reads as removing waits:",
    paragraphs: [
      "Every change in 3.4 removes a wait. Refund confirmations no longer sit in the queue until the next drain, group membership no longer waits on a full directory sync, and large CSV exports no longer stop short at the gateway.",
    ],
    note: "It repeats no longer three times, which is deliberate and will annoy at least one reviewer.",
  },
  {
    opener: "Leading on the support queue instead:",
    paragraphs: [
      "The three questions support answered most in 3.3 are answered by 3.4 itself. Where is my refund confirmation, why is this person still in that group, and why did my export stop at 50,000 rows.",
    ],
    note: "Questions in a release note are a risk. They read well here and read badly if the next release repeats the shape.",
  },
  {
    opener: "Plainest version, no framing sentence at all:",
    paragraphs: [
      "Refund confirmations arrive within a minute. Group membership follows your identity provider on every sync. Large CSV exports finish. Everything else in 3.4 is internal.",
    ],
    note: "Four short sentences. It is the fastest to read and the least like the rest of the notes.",
  },
  {
    opener: "One that keeps the incident in view without apologising for it:",
    paragraphs: [
      "3.4 is the release where the slow paths stop being slow. Refund confirmations held during the Aug 19 queue restart were the last batch to arrive late, and the two other waits people filed tickets about, group membership and large exports, are gone with them.",
    ],
    note: "Naming Aug 19 invites questions about the 41 held confirmations. Worth it only if the incident is already public.",
  },
]

/** What actually shipped, which is where the fix and improvement split the
    opener keeps arguing about comes from. */
const RELEASE_MANIFEST: MessagePart = {
  kind: "code",
  language: "yaml",
  filename: "changelog-3.4.yaml",
  code: `release: "3.4"
freeze: 2026-08-27
changes:
  - id: refund-webhook-delivery
    area: billing
    type: fix
  - id: scim-group-sync
    area: identity
    type: improvement
  - id: csv-export-limits
    area: exports
    type: improvement`,
}

/** The delivery record the minute claim rests on, pulled from Aug 19. */
const DELIVERY_RECORD: MessagePart = {
  kind: "code",
  language: "json",
  filename: "webhook-delivery.json",
  code: `{
  "event": "charge.refunded",
  "id": "evt_3PkQ2rB8xLmR",
  "created_at": "2026-08-19T08:46:12Z",
  "delivered_at": "2026-08-19T09:12:04Z",
  "attempts": 4,
  "status": "delivered"
}`,
}

/** The sentence split, shown as the edit it is. Lines 3 to 6 come out and
    lines 7 to 12 go in, which is what the diff gutter marks. */
const SENTENCE_SPLIT: MessagePart = {
  kind: "code",
  language: "markdown",
  filename: DOC_FILENAME,
  diff: { removed: [3, 4, 5, 6], added: [7, 8, 9, 10, 11, 12] },
  code: `## Highlights

3.4 is a reliability release. Refund
confirmations reach your endpoint within a
minute, group membership stays in step with
your identity provider, and CSV exports finish.
3.4 is a reliability release.

Refund confirmations reach your endpoint
within a minute of the refund itself. Group
membership stays in step with your identity
provider, and CSV exports finish at every size.`,
}

/** The guard that turns the refund 500 into a no-op. */
const REFUND_GUARD: MessagePart = {
  kind: "code",
  language: "typescript",
  filename: "stripe-webhook.ts",
  code: `export async function onChargeRefunded(charge: Charge) {
  // A legacy charge carries no intent, so the read comes after the check.
  if (!charge.payment_intent) return ok()

  const intent = await stripe.paymentIntents.retrieve(charge.payment_intent)
  return notifyRefund(intent, charge)
}`,
}

/** How the churn split was actually counted. */
const CHURN_QUERY: MessagePart = {
  kind: "code",
  language: "sql",
  filename: "churn-by-tier.sql",
  code: `select plan_tier,
       date_trunc('month', canceled_at) as month,
       count(*) as churned
from subscriptions
where canceled_at >= date '2026-07-01'
  and canceled_at < date '2026-10-01'
group by 1, 2
order by 2, 1;`,
}

export type ChatNodeRecord = {
  id: string
  role: "user" | "assistant"
  parts: MessagePart[]
  at: string
  /** Which model wrote the reply, shown above it. Assistant turns only. */
  modelId?: string
  /** Set on a user turn that was rewritten, so its footer can say so. */
  edited?: boolean
  /** The pass behind the reply, folded away until the reader opens it. */
  reasoning?: ReasoningRecord
  /** Ids into SOURCES, in citation order, so the first one is [1]. */
  sources?: string[]
  /** Documents the reader attached to this ask. Not `sources`: those are
      index addressed by the [n] markers in a reply. */
  attachedIds?: string[]
  /** Offered under the newest reply only, so no chip answers an old turn. */
  followUps?: string[]
  /** Turns that continue from here, oldest first. The last one is the newest. */
  children: string[]
}

/** Every draft is produced the same way, so each one declares the same pass. */
const DRAFT_REASONING: ReasoningRecord = {
  seconds: 6,
  steps: [
    "Read the current opener and the fixes list under it",
    "Checked the 3.3 opener for the shape the notes already use",
    "Wrote three takes and kept the one that names results first",
  ],
}

/** Cited in order, so [1] is the draft being rewritten and [2] the precedent. */
const DRAFT_SOURCES = ["notes34", "notes33"]

/** Offered under a fresh draft. Every one hits the reply library below, so a
    follow up is answered rather than falling through to a clarifying question. */
const DRAFT_FOLLOW_UPS = [
  "Check it against the 3.3 opener",
  "List every number I need to verify",
]

/** The top of the thread. A tree can hold several, this one starts with one. */
const ROOT_IDS = ["n1"]

const NODES: Record<string, ChatNodeRecord> = {
  n1: {
    id: "n1",
    role: "user",
    at: "10:28",
    children: ["n2"],
    parts: [
      {
        kind: "text",
        text: "the highlights opener for 3.4 is still the changelog paste. take a look",
      },
    ],
  },
  n2: {
    id: "n2",
    role: "assistant",
    at: "10:29",
    modelId: "claude-sonnet-5",
    children: ["n3", "n3_edit"],
    reasoning: {
      seconds: 4,
      steps: [
        "Read the 3.4 opener and listed what it names first",
        "Pulled the 3.3 opener to compare the shape",
        "Checked which of the three names a customer would know",
      ],
    },
    sources: ["notes34", "notes33", "manifest"],
    parts: [
      {
        kind: "text",
        text: `\`${DOC_FILENAME}\` opens on three system names, and not one of them tells a reader what changed for them.[1]`,
      },
      { kind: "heading", text: "What It Names" },
      {
        kind: "list",
        items: [
          "**SCIM group sync** is the mechanism behind the fix, not the fix.",
          "**Webhook delivery** is where refunds got stuck, not what got faster.",
          "**Export limits** reads as a constraint the release adds.",
        ],
      },
      {
        kind: "text",
        text: "Only one of the three is filed as a fix, which the opener flattens.[3]",
      },
      RELEASE_MANIFEST,
      {
        kind: "text",
        text: "3.3 never named a component before its second paragraph.[2] Same shape here?",
      },
    ],
  },
  n3: {
    id: "n3",
    role: "user",
    at: "10:29",
    children: ["n4a", "n4b", "n4c"],
    parts: [{ kind: "text", text: "yes. one paragraph, no bullets" }],
  },
  n3_edit: {
    id: "n3_edit",
    role: "user",
    at: "10:32",
    edited: true,
    children: ["n9"],
    parts: [
      {
        kind: "text",
        text: "yes. one paragraph, no bullets, and lead with the refund fix since that is what support keeps hearing",
      },
    ],
  },
  n4a: {
    id: "n4a",
    role: "assistant",
    reasoning: DRAFT_REASONING,
    sources: DRAFT_SOURCES,
    at: "10:30",
    modelId: "claude-sonnet-5",
    children: ["n5"],
    parts: draftParts(RELIABILITY_DRAFT),
  },
  n5: {
    id: "n5",
    role: "user",
    at: "10:31",
    children: ["n6"],
    parts: [{ kind: "text", text: "second sentence is doing too much" }],
  },
  n6: {
    id: "n6",
    role: "assistant",
    at: "10:31",
    modelId: "claude-sonnet-5",
    children: [],
    followUps: ["Draft one more opener", "Try it as bullets instead"],
    parts: [
      {
        kind: "text",
        text: "It carries all three changes at once. Split it and the paragraph reads at pace: refunds in one sentence, group sync and exports in the next.",
      },
      SENTENCE_SPLIT,
      {
        kind: "text",
        text: "That costs a line, and the opener still sits above the fold on a phone.",
      },
    ],
  },
  n4b: {
    id: "n4b",
    role: "assistant",
    reasoning: DRAFT_REASONING,
    sources: DRAFT_SOURCES,
    at: "10:33",
    modelId: "gpt-5-1",
    children: ["n7"],
    parts: draftParts(ENUMERATED_DRAFT),
  },
  n7: {
    id: "n7",
    role: "user",
    at: "10:34",
    children: ["n8", "n8_alt"],
    parts: [
      {
        kind: "text",
        text: "drop the row count, ops will argue about the number",
      },
    ],
  },
  n8: {
    id: "n8",
    role: "assistant",
    reasoning: DRAFT_REASONING,
    sources: DRAFT_SOURCES,
    at: "10:34",
    modelId: "gpt-5-1",
    children: [],
    followUps: DRAFT_FOLLOW_UPS,
    parts: draftParts(NO_FIGURE_DRAFT),
  },
  n8_alt: {
    id: "n8_alt",
    role: "assistant",
    reasoning: DRAFT_REASONING,
    sources: DRAFT_SOURCES,
    at: "10:36",
    modelId: "claude-sonnet-5",
    children: [],
    followUps: DRAFT_FOLLOW_UPS,
    parts: draftParts(NO_FIGURE_ALT_DRAFT),
  },
  n4c: {
    id: "n4c",
    role: "assistant",
    reasoning: DRAFT_REASONING,
    sources: DRAFT_SOURCES,
    at: "10:35",
    modelId: "gemini-3-pro",
    children: [],
    followUps: ["Read the Aug 19 incident thread", "Try it as bullets instead"],
    parts: draftParts(OUTCOME_DRAFT),
  },
  n9: {
    id: "n9",
    role: "assistant",
    reasoning: DRAFT_REASONING,
    sources: DRAFT_SOURCES,
    at: "10:32",
    modelId: "claude-sonnet-5",
    children: [],
    followUps: DRAFT_FOLLOW_UPS,
    parts: draftParts(REFUND_LED_DRAFT),
  },
}

/** Key for the turns at the top of the tree, which have no parent. */
export const ROOT_KEY = "root"

/**
 * Which sibling each fork opens on. Anything absent falls through to the newest
 * child, so a version created at runtime is selected without a write here.
 */
const DEFAULT_SELECTION: Record<string, string> = {
  n2: "n3",
  n3: "n4b",
  // The tail fork opens on the first trim, so the version rail rides directly
  // above the newest reply where the reader meets the thread.
  n7: "n8",
}

/** Shown after New chat, scoped to the draft this thread is working on. */
export const STARTERS = [
  "Draft the highlights opener",
  "Check the opener against 3.3",
  "List every number I need to verify",
]

// ---------- threads ----------

export type ThreadRecord = {
  id: string
  title: string
  /** Right aligned relative time on the switcher row. */
  updatedLabel: string
  /** Recency section the switcher files this thread under. */
  recency: "today" | "yesterday" | "earlier"
  /** Seeds the header favorite toggle, which files the thread under Pinned. */
  pinned: boolean
  /** File the thread produced or reads, shown as meta on its switcher row. */
  artifact?: string
}

/** The thread this block opens on: the one holding the version tree. */
export const OPENER_THREAD_ID = "th_3d90c4"

/** The draft a New chat opens. Deliberately absent from THREADS: it earns a
    switcher row once it holds a turn, which a demo reset never keeps. */
export const NEW_THREAD_ID = "th_new"

export const THREADS: ThreadRecord[] = [
  {
    id: OPENER_THREAD_ID,
    title: "Highlights opener for 3.4",
    updatedLabel: "2m",
    recency: "today",
    pinned: true,
    artifact: DOC_FILENAME,
  },
  {
    id: "th_f2a611",
    title: "Admin guide refresh",
    updatedLabel: "1h",
    recency: "today",
    pinned: true,
    artifact: "admin-notes-3.4.pdf",
  },
  {
    id: "th_9f2k4m",
    title: "Stripe webhook 500s on charge.refunded",
    updatedLabel: "2h",
    recency: "today",
    pinned: false,
    artifact: "stripe-webhook.ts",
  },
  {
    id: "th_b820ee",
    title: "Churn by plan tier",
    updatedLabel: "3h",
    recency: "today",
    pinned: false,
    artifact: "churn-q3.csv",
  },
  {
    id: "th_5c19a0",
    title: "Mobile onboarding revamp scope",
    updatedLabel: "Yesterday",
    recency: "yesterday",
    pinned: false,
  },
  {
    id: "th_e3806b",
    title: "Rewrite the trial expiry email",
    updatedLabel: "Tue",
    recency: "earlier",
    pinned: false,
    artifact: "trial-expiry.txt",
  },
  {
    id: "th_a90f52",
    title: "Postgres index for events table",
    updatedLabel: "Mon",
    recency: "earlier",
    pinned: false,
  },
]

export type ThreadTree = {
  /** Turns at the top of the tree, oldest first. */
  rootIds: string[]
  nodes: Record<string, ChatNodeRecord>
  /** Which sibling each fork opens on, keyed by the parent turn. */
  selection: Record<string, string>
  /** The date separator at the top of this thread's scrollback. */
  separator: string
}

type TurnSeed = {
  role: "user" | "assistant"
  at: string
  text: string
  modelId?: string
  followUps?: string[]
  /** Ids into SOURCES, in citation order. */
  sources?: string[]
  /** Appended after the text, which is where a side thread's artifact goes. */
  artifact?: MessagePart
}

/** A thread with no forks in it: every turn is the only child of the one
    above. The opener thread is the one that carries versions. */
function chainThread(
  prefix: string,
  separator: string,
  seeds: TurnSeed[]
): ThreadTree {
  const nodes: Record<string, ChatNodeRecord> = {}
  seeds.forEach((seed, index) => {
    const id = `${prefix}_${index + 1}`
    nodes[id] = {
      id,
      role: seed.role,
      at: seed.at,
      modelId: seed.modelId,
      followUps: seed.followUps,
      sources: seed.sources,
      parts: seed.artifact
        ? [{ kind: "text", text: seed.text }, seed.artifact]
        : [{ kind: "text", text: seed.text }],
      children: index < seeds.length - 1 ? [`${prefix}_${index + 2}`] : [],
    }
  })
  return {
    rootIds: seeds.length > 0 ? [`${prefix}_1`] : [],
    nodes,
    selection: {},
    separator,
  }
}

/** One tree per thread, so the header switcher changes what is on screen. */
export const THREAD_TREES: Record<string, ThreadTree> = {
  [OPENER_THREAD_ID]: {
    rootIds: ROOT_IDS,
    nodes: NODES,
    selection: DEFAULT_SELECTION,
    separator: "Today 10:28 AM",
  },
  th_f2a611: chainThread("adm", "Today 9:12 AM", [
    {
      role: "user",
      at: "09:12",
      text: "does the admin guide still say exports cap at 50k rows",
    },
    {
      role: "assistant",
      at: "09:13",
      modelId: "claude-sonnet-5",
      text: "Page 14 still carries the old ceiling, and the screenshot under it shows the same warning that 3.4 removes.\n\nBoth need a pass before the notes go out, or the guide contradicts the release on its own page.",
      followUps: ["Draft the replacement paragraph"],
    },
  ]),
  th_9f2k4m: chainThread("stp", "Today 8:51 AM", [
    {
      role: "user",
      at: "08:51",
      text: "webhook is 500ing on charge.refunded again",
    },
    {
      role: "assistant",
      at: "08:52",
      modelId: "gpt-5-1",
      text: "The handler reads the payment intent off the charge before checking that the charge came from one. A refund on a legacy charge has none, so it throws before the signature check ever matters. Guard that read and the 500 becomes a no-op.",
      artifact: REFUND_GUARD,
      followUps: ["Show me the guard"],
    },
  ]),
  th_b820ee: chainThread("chr", "Today 8:04 AM", [
    {
      role: "user",
      at: "08:04",
      text: "churn by plan tier for q3, teams against business",
    },
    {
      role: "assistant",
      at: "08:05",
      modelId: "gemini-3-pro",
      text: "Teams churned 4.1 percent across Q3 and Business 1.6 percent.[1] Both sit inside the range the last four quarters set, so nothing in the file supports calling this a trend. The number worth a second look is Teams in September, at 2.2 percent the highest single month in the export.",
      artifact: CHURN_QUERY,
      followUps: ["Break September down by week"],
      sources: ["churn"],
    },
  ]),
  th_5c19a0: chainThread("mob", "Yesterday 4:40 PM", [
    {
      role: "user",
      at: "16:40",
      text: "what did we agree the mobile onboarding revamp covers",
    },
    {
      role: "assistant",
      at: "16:41",
      modelId: "claude-sonnet-5",
      text: "Three screens: sign in, the workspace picker and the first run checklist. Everything past the checklist stayed out so the release does not grow a second track.\n\nThe open question is whether the invite flow counts as sign in or as its own screen.",
      followUps: ["Write that up as a scope note"],
    },
  ]),
  th_e3806b: chainThread("trl", "Tuesday 11:22 AM", [
    {
      role: "user",
      at: "11:22",
      text: "the trial expiry email reads like a shutdown notice",
    },
    {
      role: "assistant",
      at: "11:23",
      modelId: "gpt-5-1",
      text: "It opens on what stops working and never says what is kept. Leading with the export link changes the whole read: the data is yours, the workspace is waiting, and the plan page is one line down.\n\nSame length, and the unsubscribe copy stays untouched.",
      followUps: ["Draft that opening line"],
    },
  ]),
  th_a90f52: chainThread("pgx", "Monday 2:05 PM", [
    {
      role: "user",
      at: "14:05",
      text: "events table scan is 900ms on the activity page",
    },
    {
      role: "assistant",
      at: "14:06",
      modelId: "mistral-large",
      text: "The query filters on the workspace and orders by creation time, and the only index covers the workspace alone, so every page sorts the whole partition.\n\nA composite index over both columns in that order turns the sort into an index scan.",
      followUps: ["Write the migration"],
    },
  ]),
  [NEW_THREAD_ID]: chainThread("new", "Today", []),
}

/** The capability menu on the composer. Each one fills the box with a prompt
    the reply library answers, so the menu shortcuts work rather than mode. */
export const SKILLS: { id: string; label: string; prompt: string }[] = [
  {
    id: "rewrite",
    label: "Rewrite the opener",
    prompt: "rewrite the opener as one paragraph, no bullets",
  },
  {
    id: "compare",
    label: "Compare with 3.3",
    prompt: "how does this read against the 3.3 opener",
  },
  {
    id: "verify",
    label: "Verify the numbers",
    prompt: "list every number I need to verify",
  },
]

/** What the attach control can put on the next message. Each is an id into
    SOURCES, so an attached document is the object the reply cites back. */
export const ATTACH_SOURCES: { id: string; label: string; sourceId: string }[] =
  [
    { id: "notes", label: "Release notes", sourceId: "notes34" },
    { id: "prior", label: "Previous release", sourceId: "notes33" },
    { id: "incident", label: "Incident thread", sourceId: "incident" },
    { id: "tickets", label: "Export tickets", sourceId: "tickets" },
  ]

type ReplyEntry = {
  match: string[]
  /** Set instead of parts when the ask is for a new take on the paragraph. */
  draft?: true
  /** Rotated per turn, for an ask whose answer is a fresh take on one
      paragraph but must not reprint a figure the ask just removed. */
  pool?: OpenerDraft[]
  parts?: MessagePart[]
  followUps?: string[]
  reasoning?: ReasoningRecord
  /** Ids into SOURCES, in citation order. */
  sources?: string[]
}

/** First hit wins, so an ask that is plainly a rewrite is matched before the
    terms it happens to share with a question about the draft. */
const REPLY_LIBRARY: ReplyEntry[] = [
  { match: ["one paragraph", "no bullets", "draft", "rewrite"], draft: true },
  {
    match: ["3.3", "tone", "voice", "compare"],
    followUps: ["Draft one more opener", "Read the Aug 19 incident thread"],
    sources: ["notes33", "notes34"],
    reasoning: {
      seconds: 5,
      steps: [
        "Read the 3.3 opener end to end",
        "Marked where each one first names a component",
        "Checked whether the difference is order or wording",
      ],
    },
    parts: [
      {
        kind: "text",
        text: "3.3 opened on the reader and named nothing until its second paragraph.[1] Ours breaks that twice.",
      },
      { kind: "heading", text: "Where It Differs" },
      {
        kind: "list",
        items: [
          "`SCIM` lands in the first clause, before the reader knows why it matters.[2]",
          "The opening sentence describes a sync running, not a result arriving.",
        ],
      },
      {
        kind: "text",
        text: "The fix is the order, not the words. Lead with what stopped being slow and the component names can stay exactly where they are.",
      },
    ],
  },
  {
    match: ["verify", "numbers", "figures", "check the numbers"],
    followUps: ["Read the Aug 19 incident thread"],
    sources: ["tickets", "incident", "plans", "notes34"],
    reasoning: {
      seconds: 8,
      steps: [
        "Pulled every figure out of the 3.4 draft",
        "Traced each one back to the ticket or thread it came from",
        "Flagged the one with nothing behind it",
      ],
    },
    parts: [
      {
        kind: "text",
        text: "Four numbers are in play, and one of them has nothing behind it.",
      },
      { kind: "heading", text: "Numbers To Verify" },
      {
        kind: "list",
        ordered: true,
        items: [
          "**50,000 rows** is the export ceiling, and it comes straight from the tickets.[1]",
          "**41 held confirmations** and the **08:46 to 09:12** window both come from the incident thread.[2]",
          "**400 days** of audit history is on the Enterprise plan page.[3]",
          "**Within a minute** is the unsourced one. Nothing in the draft measures delivery at the endpoint.[4]",
        ],
      },
      {
        kind: "text",
        text: "That last one is the claim to pull. The only delivery record in the incident thread runs like this.[2]",
      },
      DELIVERY_RECORD,
      {
        kind: "text",
        text: "Twenty six minutes, on the day the queue stalled. The sentence is safe for a normal day and wrong for that one, so it needs a qualifier or a figure out of the delivery logs before Thursday.",
      },
    ],
  },
  {
    match: ["refund", "webhook", "aug 19", "incident"],
    followUps: ["Draft one more opener"],
    sources: ["incident", "notes34"],
    reasoning: {
      seconds: 5,
      steps: [
        "Read the Aug 19 thread from the first alert to the restart",
        "Counted the confirmations held and when each one landed",
        "Checked the draft claim against what the thread supports",
      ],
    },
    parts: [
      {
        kind: "text",
        text: "The thread supports the claim but not the framing.[1]",
      },
      { kind: "heading", text: "What It Shows" },
      {
        kind: "list",
        items: [
          "41 confirmations were held between **08:46 and 09:12**.",
          "Every one of them delivered after the worker restart, and none were lost.",
        ],
      },
      {
        kind: "text",
        text: "So the opener can say confirmations arrive within a minute.[2] It cannot say they never queue, because on Aug 19 they did.",
      },
    ],
  },
  {
    match: ["as bullets", "bullet list", "make it a list"],
    followUps: ["Draft one more opener"],
    sources: ["notes34", "notes33"],
    reasoning: {
      seconds: 3,
      steps: [
        "Counted the lists already on the page",
        "Checked the last release that opened on one",
      ],
    },
    parts: [
      {
        kind: "text",
        text: "Bullets would read faster, and the notes have not opened on a list since 3.1. Fixes and changes below is already a list, so a second one turns the page into two lists and no prose.\n\nIf you want the speed of a list, the four sentence version gets close without changing the shape of the page.",
      },
    ],
  },
  {
    // The seeded follow-up on version 1, so a regenerate there answers the
    // same ask again instead of falling through to a clarifying question.
    match: ["second sentence", "doing too much", "one change per sentence"],
    followUps: ["Draft one more opener"],
    sources: ["notes34"],
    reasoning: {
      seconds: 3,
      steps: [
        "Split the sentence and re-read the paragraph at pace",
        "Checked the added line still sits above the fold on a phone",
      ],
    },
    parts: [
      {
        kind: "text",
        text: "Give refunds the second sentence alone and let group sync and exports share the third.",
      },
      SENTENCE_SPLIT,
      {
        kind: "text",
        text: "The paragraph gains a line, every claim gets its own verb, and nothing has to be re-sourced.",
      },
    ],
  },
  {
    // The seeded follow-up on version 2. A regenerate returns a rival trim,
    // never a draft with the row count the ask just removed.
    match: ["row count", "drop the", "argue about"],
    followUps: DRAFT_FOLLOW_UPS,
    sources: DRAFT_SOURCES,
    reasoning: DRAFT_REASONING,
    pool: TRIM_DRAFTS,
  },
  { match: ["opener", "highlights", "paragraph"], draft: true },
]

const FALLBACK_REPLIES: MessagePart[][] = [
  [
    {
      kind: "text",
      text: "Which paragraph, the opener or the fixes list? They carry different tenses and I would rather not mix them.",
    },
  ],
  [
    {
      kind: "text",
      text: `Nothing in the 3.4 tickets covers that. Point me at the issue or the incident thread and I will pull the detail into \`${DOC_FILENAME}\`.`,
    },
  ],
  [
    {
      kind: "text",
      text: "One constraint first: the 3.4 freeze holds until Thursday, so anything that names new behavior ships in the 3.5 notes instead.",
    },
  ],
]

export type ReplyDraft = {
  parts: MessagePart[]
  /** Rides the reply record; only the newest one renders them. */
  followUps?: string[]
  reasoning?: ReasoningRecord
  /** Ids into SOURCES, in citation order. */
  sources?: string[]
}

/**
 * Answers a prompt. `turn` and the model both shift which draft comes back, so
 * a second regenerate never returns the version already on screen.
 */
export function composeReply(
  prompt: string,
  modelId: string,
  turn = 0
): ReplyDraft {
  const needle = prompt.toLowerCase()
  const hit = REPLY_LIBRARY.find((entry) =>
    entry.match.some((term) => needle.includes(term))
  )
  if (hit?.draft) {
    const pick = (turn + modelIndex(modelId)) % REGENERATED_DRAFTS.length
    return {
      parts: draftParts(REGENERATED_DRAFTS[pick]),
      followUps: DRAFT_FOLLOW_UPS,
      reasoning: DRAFT_REASONING,
      sources: DRAFT_SOURCES,
    }
  }
  if (hit?.pool) {
    const pick = (turn + modelIndex(modelId)) % hit.pool.length
    return {
      parts: draftParts(hit.pool[pick]),
      followUps: hit.followUps,
      reasoning: hit.reasoning,
      sources: hit.sources,
    }
  }
  if (hit?.parts)
    return {
      parts: hit.parts,
      followUps: hit.followUps,
      reasoning: hit.reasoning,
      sources: hit.sources,
    }
  // A clarifying question read nothing, so it cites nothing.
  return { parts: FALLBACK_REPLIES[turn % FALLBACK_REPLIES.length] }
}

/** One row on the activity stack: what the model is doing, and what it opened
    to do it. Completed rows stay on screen, so the reader sees the whole pass. */
export type ActivityStep = {
  label: string
  /** Id into SOURCES, named as a chip on the row. */
  source?: string
}

/** Ordered like REPLY_LIBRARY, so the stack names the work actually in flight. */
const ACTIVITY_PLANS: { match: string[]; steps: ActivityStep[] }[] = [
  {
    match: ["one paragraph", "no bullets", "draft", "rewrite"],
    steps: [
      { label: "Reading the draft", source: "notes34" },
      { label: "Checking the 3.3 opener", source: "notes33" },
      { label: "Drafting the paragraph" },
    ],
  },
  {
    match: ["3.3", "tone", "voice", "compare"],
    steps: [
      { label: "Reading the 3.3 opener", source: "notes33" },
      { label: "Comparing the two openings" },
    ],
  },
  {
    match: ["verify", "numbers", "figures"],
    steps: [
      { label: "Collecting every figure", source: "notes34" },
      { label: "Tracing them to the tickets", source: "tickets" },
      { label: "Checking the incident thread", source: "incident" },
    ],
  },
  {
    match: ["refund", "webhook", "aug 19", "incident"],
    steps: [
      { label: "Reading the Aug 19 thread", source: "incident" },
      { label: "Checking what it supports" },
    ],
  },
  {
    match: ["second sentence", "doing too much"],
    steps: [{ label: "Splitting the sentence", source: "notes34" }],
  },
  {
    match: ["row count", "drop the"],
    steps: [
      { label: "Trimming the figure", source: "notes34" },
      { label: "Rewriting the sentence around it" },
    ],
  },
  {
    match: ["opener", "highlights", "paragraph"],
    steps: [
      { label: "Reading the draft", source: "notes34" },
      { label: "Drafting the paragraph" },
    ],
  },
]

/** An ask nothing matches still shows work, just nothing it opened. */
const DEFAULT_STEPS: ActivityStep[] = [
  { label: "Reading the thread" },
  { label: "Working on a reply" },
]

/** The pass the thinking stack walks. Swap for the steps your backend reports. */
export function stepsFor(prompt: string): ActivityStep[] {
  const needle = prompt.toLowerCase()
  const hit = ACTIVITY_PLANS.find((entry) =>
    entry.match.some((term) => needle.includes(term))
  )
  return hit?.steps ?? DEFAULT_STEPS
}

/** What a screen reader is given when a reply settles. A code artifact is
    named rather than read: nobody wants a yaml file spelled out. */
export function spokenText(node: ChatNodeRecord) {
  return node.parts
    .map((part) => {
      if (part.kind === "code")
        return `Code artifact, ${part.filename ?? DOC_FILENAME}, ${part.language}.`
      if (part.kind === "list") return part.items.join(" ")
      return part.text
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Flattens a turn back to plain text, so Copy hands over what was read. */
export function nodeText(node: ChatNodeRecord) {
  return node.parts
    .map((part) => {
      if (part.kind === "code") return part.code
      if (part.kind === "list")
        return part.items
          .map(
            (item, index) => `${part.ordered ? `${index + 1}.` : "-"} ${item}`
          )
          .join("\n")
      return part.text
    })
    .join("\n\n")
    .trim()
}