import { RefreshCwIcon, ZapIcon, KeyRoundIcon, DownloadIcon } from "lucide-react";

export const ORG_NAME = "Halcyon Labs"
export const PRODUCT_NAME = "ReUI Pro"
export const ASSISTANT_NAME = "Ask AI"
export const COMPOSER_PLACEHOLDER = "Ask about ReUI Pro"
export const THREAD_SEPARATOR = "Today"

/** Ceiling the composer counts against, matching a real support intake form. */
export const MESSAGE_LIMIT = 1000

/** Who picks up a handed off question, named so the promise is checkable. */
export const SUPPORT_AGENT = "Sam Okafor"

export type ArticleRecord = {
  id: string
  title: string
  /** The docs section it lives under, so a citation carries its shelf. */
  section: string
  updated: string
}

// customize: point these at your own knowledge base. Ids are the only thing
// answers reference, so titles and sections can change freely.
export const ARTICLES: ArticleRecord[] = [
  {
    id: "doc_4b19ca",
    title: "Webhook retries and backoff",
    section: "Webhooks",
    updated: "Updated 6 days ago",
  },
  {
    id: "doc_20b8fa",
    title: "Delivery failures and the dead letter queue",
    section: "Webhooks",
    updated: "Updated 2 weeks ago",
  },
  {
    id: "doc_7c31be",
    title: "Verifying webhook signatures",
    section: "Webhooks",
    updated: "Updated 5 weeks ago",
  },
  {
    id: "doc_e5a072",
    title: "Event types reference",
    section: "API reference",
    updated: "Updated 3 days ago",
  },
  {
    id: "doc_1d8f30",
    title: "Rate limits and burst credits",
    section: "API reference",
    updated: "Updated 9 days ago",
  },
  {
    id: "doc_9c2b47",
    title: "Bulk endpoints",
    section: "API reference",
    updated: "Updated 4 days ago",
  },
  {
    id: "doc_b62c91",
    title: "Rotating an API key",
    section: "Authentication",
    updated: "Updated 4 weeks ago",
  },
  {
    id: "doc_3af518",
    title: "SAML single sign on",
    section: "Authentication",
    updated: "Updated 7 weeks ago",
  },
  {
    id: "doc_c04e7d",
    title: "Seats, plans and proration",
    section: "Billing",
    updated: "Updated 11 days ago",
  },
  {
    id: "doc_58e1b3",
    title: "Exporting a workspace",
    section: "Data",
    updated: "Updated 3 weeks ago",
  },
  {
    id: "doc_a71f26",
    title: "Retention and deletion",
    section: "Data",
    updated: "Updated 6 weeks ago",
  },
]

export function articleById(id: string) {
  return ARTICLES.find((entry) => entry.id === id)
}

export function articlesByIds(ids: string[]) {
  return ids
    .map(articleById)
    .filter((entry): entry is ArticleRecord => Boolean(entry))
}

export type StepRecord = {
  text: string
}

/** An answer the knowledge base could support, with the reading behind it. */
export type AnswerBody = {
  kind: "answer"
  lead: string
  steps?: StepRecord[]
  /** The caveat the reader would otherwise learn the hard way. */
  note?: string
  /** Every article the search returned, in the order it was read. */
  matched: string[]
  /** The subset that survived into the answer. */
  usedIds: string[]
  followUps?: string[]
}

/** The honest miss: read everything, found nothing, offer a person instead. */
export type HandoffBody = {
  kind: "handoff"
  lead: string
  detail: string
  matched: string[]
}

export type ReplyBody = AnswerBody | HandoffBody

export type TurnRecord =
  | { id: string; kind: "asked"; text: string }
  | { id: string; kind: "said"; text: string }
  | ({ id: string } & AnswerBody)
  | ({ id: string } & HandoffBody)

/** Flattens a turn for the clipboard, steps and note included. */
export function turnText(turn: TurnRecord): string {
  if (turn.kind === "asked" || turn.kind === "said") return turn.text
  if (turn.kind === "handoff") return `${turn.lead}\n\n${turn.detail}`
  return [
    turn.lead,
    ...(turn.steps ?? []).map((step, index) => `${index + 1}. ${step.text}`),
    turn.note ?? "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

const WEBHOOK_ANSWER: AnswerBody = {
  kind: "answer",
  lead: "ReUI Pro retries whenever your endpoint answers with anything outside the 200 range, or takes longer than ten seconds to answer at all.",
  steps: [
    {
      text: "Open the delivery log for the failing event and read the status ReUI Pro recorded against each attempt.",
    },
    {
      text: "Acknowledge inside ten seconds. Return the response first, then do the work in a background job.",
    },
    {
      text: "Check the signature step. A rejected signature answers with 400, which counts as a failure and starts the backoff again.",
    },
    {
      text: "Return 200 for events you mean to ignore, so they leave the queue instead of retrying for a day.",
    },
  ],
  note: "Every attempt carries the same event id, so the handler has to be safe to run twice.",
  matched: [
    "doc_4b19ca",
    "doc_20b8fa",
    "doc_7c31be",
    "doc_e5a072",
    "doc_1d8f30",
    "doc_a71f26",
  ],
  usedIds: ["doc_4b19ca", "doc_20b8fa", "doc_7c31be", "doc_e5a072"],
  followUps: [
    "How do I replay a dead lettered event?",
    "How long does the backoff run?",
  ],
}

const BACKOFF_ANSWER: AnswerBody = {
  kind: "answer",
  lead: "Eight attempts over roughly 24 hours, spaced further apart each time, then the event stops being retried.",
  steps: [
    {
      text: "The first four attempts land inside the first hour, starting one minute after the failure.",
    },
    {
      text: "The last four spread across the rest of the day, the final one about 18 hours in.",
    },
    {
      text: "After the eighth the event moves to the dead letter queue, where it waits 30 days for a replay.",
    },
  ],
  note: "A replay resets the count, so a fixed endpoint gets the full budget again.",
  matched: ["doc_4b19ca", "doc_20b8fa", "doc_e5a072"],
  usedIds: ["doc_4b19ca", "doc_20b8fa"],
  followUps: ["Can I replay a whole batch at once?"],
}

const REPLAY_ANSWER: AnswerBody = {
  kind: "answer",
  lead: "Dead lettered events stay replayable for 30 days, one at a time or by filter.",
  steps: [
    {
      text: "Filter the dead letter queue by event type and the window you care about.",
    },
    {
      text: "Replay the selection. ReUI Pro sends them in the order they were first created.",
    },
    {
      text: "Watch the delivery log. A second failure sends the event straight back to the queue.",
    },
  ],
  note: "A replay batch is capped at 500 events, so a long outage takes a few passes.",
  matched: ["doc_20b8fa", "doc_4b19ca", "doc_9c2b47", "doc_e5a072"],
  usedIds: ["doc_20b8fa", "doc_9c2b47"],
  followUps: ["Why do my webhook deliveries keep retrying?"],
}

const RATE_LIMIT_ANSWER: AnswerBody = {
  kind: "answer",
  lead: "Every workspace gets 600 requests a minute across the API, plus a burst pool that refills while you sit under the limit.",
  steps: [
    {
      text: "Read the remaining budget from the rate limit headers on every response, not only on failures.",
    },
    {
      text: "When a 429 comes back, wait the number of seconds it names in Retry After before trying again.",
    },
    {
      text: "Move list reads onto the bulk endpoints, which spend one request instead of one per record.",
    },
  ],
  note: "Search is metered on its own at 60 requests a minute and does not touch the main pool.",
  matched: [
    "doc_1d8f30",
    "doc_9c2b47",
    "doc_e5a072",
    "doc_4b19ca",
    "doc_c04e7d",
  ],
  usedIds: ["doc_1d8f30", "doc_9c2b47", "doc_e5a072"],
  followUps: [
    "Which endpoints support bulk reads?",
    "Can I raise the limit on my plan?",
  ],
}

const BULK_ANSWER: AnswerBody = {
  kind: "answer",
  lead: "Events, members and documents all read in bulk. Each call returns up to 200 records for the price of one request.",
  steps: [
    {
      text: "Ask for the page size you want, up to 200. ReUI Pro returns a cursor whenever more is waiting.",
    },
    {
      text: "Pass the cursor straight back. Cursors stay valid for an hour, so a slow job can pause safely.",
    },
    {
      text: "Narrow with a filter before paginating. Filtering happens before the count, so it costs you nothing.",
    },
  ],
  matched: ["doc_9c2b47", "doc_1d8f30", "doc_e5a072"],
  usedIds: ["doc_9c2b47", "doc_1d8f30"],
  followUps: ["What are the API rate limits?"],
}

const API_KEY_ANSWER: AnswerBody = {
  kind: "answer",
  lead: "Rotating is a two key swap, so traffic moves across without a window where nothing works.",
  steps: [
    {
      text: "Create a second key under Settings, Authentication. Both keys stay live at the same time.",
    },
    {
      text: "Deploy the new key, then watch the old key's usage fall to zero in the key log.",
    },
    {
      text: "Revoke the old key. Revoking takes effect at once and cannot be undone.",
    },
  ],
  note: "A key's value is shown once, when it is created. Store it before you close the dialog.",
  matched: ["doc_b62c91", "doc_3af518", "doc_7c31be", "doc_a71f26"],
  usedIds: ["doc_b62c91", "doc_7c31be"],
  followUps: [
    "Can I scope a key to one workspace?",
    "How do I set up SAML sign on?",
  ],
}

const SSO_ANSWER: AnswerBody = {
  kind: "answer",
  lead: "SAML runs on Scale and Enterprise. The exchange goes out to your identity provider and back once.",
  steps: [
    {
      text: "Copy the ReUI Pro metadata URL from Settings, Authentication into a new application in your provider.",
    },
    {
      text: "Map email, first name and last name. ReUI Pro reads nothing else from the assertion.",
    },
    {
      text: "Paste the provider's sign on URL and certificate back into ReUI Pro, then test with your own account.",
    },
    {
      text: "Turn on enforcement once the test passes. Existing passwords stop working the moment you do.",
    },
  ],
  note: "Keep one owner on password sign in until enforcement is proven, or a bad certificate locks the workspace out.",
  matched: ["doc_3af518", "doc_b62c91", "doc_c04e7d", "doc_a71f26"],
  usedIds: ["doc_3af518", "doc_c04e7d"],
  followUps: ["How do I rotate an API key?"],
}

const EXPORT_ANSWER: AnswerBody = {
  kind: "answer",
  lead: "A workspace exports whole, and the archive stays downloadable for 30 days after you ask for it.",
  steps: [
    {
      text: "Start the export from Settings, Data. Only workspace owners can, and it takes a few hours on a large workspace.",
    },
    {
      text: "Download the archive from the link ReUI Pro emails you. Threads, documents and members come out as JSON.",
    },
    {
      text: "Cancelling does not delete anything straight away. Data is held for 30 days, then removed for good.",
    },
  ],
  note: "An export started before you cancel stays available for its full 30 days.",
  matched: ["doc_58e1b3", "doc_a71f26", "doc_c04e7d", "doc_3af518"],
  usedIds: ["doc_58e1b3", "doc_a71f26"],
  followUps: ["What happens to my seats when I cancel?"],
}

const SEATS_ANSWER: AnswerBody = {
  kind: "answer",
  lead: "Seats are charged for the days they exist. Adding one part way through a month costs the remainder of that month.",
  steps: [
    {
      text: "Removing a seat credits the unused days against your next invoice rather than refunding it.",
    },
    {
      text: "A deactivated member keeps their history and stops counting the same day.",
    },
    {
      text: "Annual plans price the seat for the rest of the term, so the credit is larger and lands once.",
    },
  ],
  matched: ["doc_c04e7d", "doc_58e1b3", "doc_a71f26"],
  usedIds: ["doc_c04e7d"],
  followUps: ["Can I export my workspace data?"],
}

const REFUND_HANDOFF: HandoffBody = {
  kind: "handoff",
  lead: "I could not find this one in the documentation.",
  detail:
    "Refunds on an annual term are decided against the account rather than by a rule, so this needs a person. I can open a ticket with this conversation attached.",
  matched: ["doc_c04e7d", "doc_58e1b3", "doc_a71f26"],
}

const UNKNOWN_HANDOFF: HandoffBody = {
  kind: "handoff",
  lead: "Nothing in the documentation covers this yet.",
  detail:
    "I read the closest articles and none of them answer the question you asked. Rather than guess, I can pass it to support with everything from this conversation.",
  matched: ["doc_e5a072", "doc_1d8f30", "doc_c04e7d", "doc_a71f26"],
}

type ReplyEntry = {
  match: string[]
  /** Try again walks this list, so a second take is a different answer. */
  bodies: ReplyBody[]
}

const REPLY_LIBRARY: ReplyEntry[] = [
  {
    match: ["replay", "dead letter", "dead lettered"],
    bodies: [REPLAY_ANSWER],
  },
  {
    match: ["backoff", "back off", "how long", "schedule", "attempts"],
    bodies: [BACKOFF_ANSWER],
  },
  {
    match: ["webhook", "retry", "retries", "retrying", "delivery", "500"],
    bodies: [WEBHOOK_ANSWER, BACKOFF_ANSWER],
  },
  { match: ["bulk", "batch", "pagination", "cursor"], bodies: [BULK_ANSWER] },
  {
    match: ["rate limit", "rate limits", "429", "throttle", "limit"],
    bodies: [RATE_LIMIT_ANSWER, BULK_ANSWER],
  },
  {
    match: ["api key", "key", "token", "secret", "rotate", "credential"],
    bodies: [API_KEY_ANSWER],
  },
  {
    match: ["saml", "sso", "single sign", "okta", "sign on", "login"],
    bodies: [SSO_ANSWER],
  },
  {
    match: ["export", "download", "gdpr", "delete", "retention"],
    bodies: [EXPORT_ANSWER],
  },
  {
    match: ["refund", "money back", "credit card", "charge me"],
    bodies: [REFUND_HANDOFF],
  },
  {
    match: ["seat", "seats", "proration", "plan", "billing", "cancel"],
    bodies: [SEATS_ANSWER, REFUND_HANDOFF],
  },
]

/** Rotates so an unmatched question is not always the same shrug. */
const FALLBACK_REPLIES: ReplyBody[] = [
  UNKNOWN_HANDOFF,
  RATE_LIMIT_ANSWER,
  UNKNOWN_HANDOFF,
  EXPORT_ANSWER,
]

/** Picks the answer for a question; `take` walks the alternates on Try again. */
export function composeReply(prompt: string, turn = 0, take = 0): ReplyBody {
  const text = prompt.toLowerCase()
  const entry = REPLY_LIBRARY.find((candidate) =>
    candidate.match.some((word) => text.includes(word))
  )
  if (entry) return entry.bodies[take % entry.bodies.length]
  return FALLBACK_REPLIES[(turn + take) % FALLBACK_REPLIES.length]
}

/** The conversation the panel opens on, already one answer deep. */
export const OPENING_TURNS: TurnRecord[] = [
  {
    id: "asked_seed",
    kind: "asked",
    text: "Why do my webhook deliveries keep retrying?",
  },
  { id: "answer_seed", ...WEBHOOK_ANSWER },
]

export type StarterRecord = {
  id: string
  label: string
  prompt: string
  icon: React.ReactNode
}

export const STARTERS: StarterRecord[] = [
  {
    id: "starter_webhooks",
    label: "Webhook retries",
    prompt: "Why do my webhook deliveries keep retrying?",
    icon: (
      <RefreshCwIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
    ),
  },
  {
    id: "starter_limits",
    label: "Rate limits",
    prompt: "What are the API rate limits?",
    icon: (
      <ZapIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
    ),
  },
  {
    id: "starter_keys",
    label: "Rotate a key",
    prompt: "How do I rotate an API key?",
    icon: (
      <KeyRoundIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
    ),
  },
  {
    id: "starter_export",
    label: "Export data",
    prompt: "Can I export my workspace data?",
    icon: (
      <DownloadIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
    ),
  },
]

/** Handed out in order, so a demo ticket never collides with itself. */
const TICKET_IDS = ["HAL-4821", "HAL-4822", "HAL-4823", "HAL-4824"]

export function ticketOpenedText(index: number) {
  const id = TICKET_IDS[index % TICKET_IDS.length]
  return `Ticket ${id} is open. ${SUPPORT_AGENT} has this conversation and replies by email, usually within a working day.`
}