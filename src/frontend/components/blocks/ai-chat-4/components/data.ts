export type PersonRecord = {
  name: string
  initials: string
  avatar: string
}

export const PRIYA: PersonRecord = {
  name: "Priya Nair",
  initials: "PN",
  avatar:
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
}

export const MAYA: PersonRecord = {
  name: "Maya Chen",
  initials: "MC",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
}

export const JONAS: PersonRecord = {
  name: "Jonas Weber",
  initials: "JW",
  avatar:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
}

/** The designer the panel opens for. */
export const VIEWER = PRIYA

export const ORG_NAME = "ReUI Labs"
export const ASSISTANT_NAME = "ReUI Chat"
export const COMPOSER_PLACEHOLDER = "Ask AI anything"

export type ModelRecord = {
  id: string
  name: string
  provider: string
  /** Context window, unit free so the view owns the label. */
  context: string
}

export const MODELS: ModelRecord[] = [
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    context: "200K",
  },
  { id: "gpt-5-1", name: "GPT-5.1", provider: "OpenAI", context: "256K" },
]

export type ModeRecord = {
  id: string
  name: string
  detail: string
}

export const MODES: ModeRecord[] = [
  { id: "auto", name: "Auto", detail: "Picks depth per question" },
  { id: "fast", name: "Fast", detail: "Short answers, no browsing" },
  { id: "deep", name: "Deep", detail: "Reads every source first" },
]

export type SourceRecord = {
  id: string
  title: string
  /** What the card says under the title. */
  meta: string
  owner: PersonRecord
}

/** The two workspace documents this thread is reading. */
export const SOURCES: SourceRecord[] = [
  {
    id: "src_sync",
    title: "Trust research sync",
    meta: "24 min, Aug 24",
    owner: MAYA,
  },
  {
    id: "src_review",
    title: "Design review, AI states",
    meta: "41 min, Aug 25",
    owner: JONAS,
  },
]

export function sourcesFor(ids: string[] | undefined) {
  if (!ids?.length) return []
  return SOURCES.filter((source) => ids.includes(source.id))
}

export type ChatMessageRecord = {
  id: string
  role: "user" | "assistant"
  at: string
  /** Paragraphs separated by a blank line. Backticks render as inline code. */
  text: string
  /** Documents riding with the turn, attached by the reader or cited by a reply. */
  sourceIds?: string[]
  /** The sentence this turn is replying to, picked out of an earlier answer. */
  quote?: string
  /** Assistant only: what the section header names the answer, and its runtime. */
  title?: string
  duration?: string
  followUps?: string[]
}

export type ThreadRecord = {
  id: string
  title: string
  at: string
  /** Labels the top of the visible scrollback. */
  separator?: string
  messages: ChatMessageRecord[]
  /** Delivered after the thinking beat, so the reveal happens on screen. */
  opening: ChatMessageRecord
}

export const THREADS: ThreadRecord[] = [
  {
    id: "th_trust",
    title: "Trust in AI replies",
    at: "11:07",
    separator: "Today",
    messages: [
      {
        id: "m_01",
        role: "user",
        at: "11:02",
        text: "We keep hearing that the assistant sounds certain even when it is guessing. What should the reply itself do about that?",
      },
      {
        id: "m_02",
        role: "assistant",
        at: "11:03",
        title: "Confidence Signals",
        duration: "6s",
        text: 'Say the shape of the doubt, not the size of it. A reply that admits which part is thin reads as more reliable than one that prints a percentage nobody can audit.\n\nThree moves carry most of it. Name the source before the claim, separate what was measured from what was inferred, and offer the cheapest next check instead of a hedge.\n\nThe live region matters as much as the wording. A reply that announces itself through `role="status"` lets a screen reader hear the answer settle rather than guess at it.',
      },
      {
        id: "m_03",
        role: "user",
        at: "11:05",
        sourceIds: ["src_sync", "src_review"],
        text: "Both sessions are attached. Pull out what people actually asked for, not what we assumed.",
      },
    ],
    opening: {
      id: "m_04",
      role: "assistant",
      at: "11:07",
      title: "Session Findings",
      duration: "12s",
      sourceIds: ["src_sync", "src_review"],
      followUps: ["Draft the pattern note", "What did they reject"],
      text: "Across both sessions the same three asks came up, and none of them was about accuracy.\n\nPeople wanted to know where an answer came from before they read it. Nine of eleven scrolled to the sources first.\n\nThey wanted the reply to hold still. Two participants lost their place when the text reflowed mid answer.\n\nAnd they wanted to argue with one sentence rather than the whole answer. That one is worth building.",
    },
  },
  {
    id: "th_uncertainty",
    title: "Uncertainty patterns",
    at: "Yesterday",
    separator: "Yesterday",
    messages: [
      {
        id: "u_01",
        role: "user",
        at: "16:40",
        text: "Which uncertainty patterns survived the last round?",
      },
    ],
    opening: {
      id: "u_02",
      role: "assistant",
      at: "16:41",
      title: "What Survived",
      duration: "9s",
      sourceIds: ["src_review"],
      followUps: ["What did they reject"],
      text: "Two of five. The source list under the answer survived because people read it before the prose, and the plain sentence that names the weakest step survived because it told them what to check next.\n\nThe three that died all tried to put a number on the doubt. A confidence meter, a percentage and a coloured bar. Every participant read the number as a promise and then held us to it.",
    },
  },
  {
    id: "th_onboarding",
    title: "Onboarding copy pass",
    at: "Mon",
    separator: "Monday",
    messages: [
      {
        id: "o_01",
        role: "user",
        at: "09:18",
        text: "First run copy is too long. Cut it without losing the promise.",
      },
    ],
    opening: {
      id: "o_02",
      role: "assistant",
      at: "09:19",
      title: "Copy Cuts",
      duration: "4s",
      followUps: ["Draft the pattern note"],
      text: "Keep one promise and one action. Everything the first screen says about the model, the context window and the privacy posture can move to a link, because nobody reads it before their first question anyway.\n\nThat takes the screen from ninety words to twenty two, and the only sentence people quoted back to us in testing is still on it.",
    },
  },
  {
    id: "th_disclosure",
    title: "Source disclosure spec",
    at: "Fri",
    separator: "Friday",
    messages: [
      {
        id: "d_01",
        role: "user",
        at: "14:22",
        text: "Engineering wants a rule for when a reply has to name its sources. Give them something they can implement, not a principle.",
      },
    ],
    opening: {
      id: "d_02",
      role: "assistant",
      at: "14:23",
      title: "Disclosure Rule",
      duration: "8s",
      sourceIds: ["src_review"],
      followUps: ["Draft the pattern note"],
      text: "Name a source whenever the reply repeats a claim it did not derive itself. That is the whole rule, and it is checkable in review.\n\nTwo consequences they asked about. A summary of one document still cites that document, because the reader is trusting the document rather than the wording. A refusal cites nothing, because there is no claim underneath it.\n\nThe list renders before the prose in reading order, which is where nine of eleven participants looked first.",
    },
  },
  {
    id: "th_handoff",
    title: "Handoff to engineering",
    at: "Aug 21",
    separator: "August 21",
    messages: [
      {
        id: "h_01",
        role: "user",
        at: "10:04",
        text: "What has to be settled before this leaves research?",
      },
    ],
    opening: {
      id: "h_02",
      role: "assistant",
      at: "10:05",
      title: "Open Items",
      duration: "5s",
      followUps: ["What did they reject"],
      text: "Three things, and only the first one blocks.\n\nWhether a quoted sentence freezes or follows when the answer it came from is edited. Jonas and I disagree, and the component cannot ship until one of us loses that argument.\n\nThe other two are copy. What we call the source list, and whether the runtime on an answer is worth the pixels once the answer is no longer new.",
    },
  },
]

/** Distinct documents a thread has read, for the switcher's second line. */
export function threadSourceCount(thread: ThreadRecord) {
  const ids = new Set<string>()
  for (const message of [...thread.messages, thread.opening])
    for (const id of message.sourceIds ?? []) ids.add(id)
  return ids.size
}

/** Stopping before anything arrived still owes the reader an explanation. */
export const STOPPED_NOTE = {
  title: "Stopped",
  duration: "0s",
  text: "Stopped before the answer started. Ask again whenever you are ready.",
}

/** Rows the palette offers above the composer. */
export const SUGGESTIONS = [
  "How should AI show uncertainty?",
  "Which UI elements build trust in AI responses?",
  "What signals make AI responses feel reliable?",
]

type ReplySpec = {
  match: string[]
  title: string
  duration: string
  text: string
  followUps?: string[]
  sourceIds?: string[]
}

/** Keyed on the terms the palette, the follow ups and the source chips use.
    First hit wins, so the broad entries sit last. */
const REPLY_LIBRARY: ReplySpec[] = [
  {
    match: ["uncertainty", "guessing", "doubt"],
    title: "Showing Doubt",
    duration: "7s",
    sourceIds: ["src_review"],
    followUps: ["What did they reject", "Draft the pattern note"],
    text: "Put the doubt where the claim is, in the same sentence, in words. A reader who has to hunt for a caveat treats it as fine print.\n\nThe pattern that tested best names the weakest step and stops there. No meter, no percentage, no colour. One clause that says which part would move first if the input changed.",
  },
  {
    match: ["trust", "ui elements", "build trust"],
    title: "Trust Elements",
    duration: "9s",
    sourceIds: ["src_sync", "src_review"],
    followUps: ["Draft the pattern note", "What did they reject"],
    text: "Four elements did the work, and three of them are about provenance rather than tone.\n\nA source list that is visible without opening anything. A timestamp on the answer, not on the thread. An action row that survives the answer being wrong, so a correction costs one press. And a reply that can be argued with one sentence at a time.\n\nThe fourth is the only one nobody else ships, which is why it is worth the build.",
  },
  {
    match: ["reliable", "signals", "feel reliable"],
    title: "Reliability Signals",
    duration: "8s",
    sourceIds: ["src_sync"],
    followUps: ["Draft the pattern note"],
    text: "Consistency beats confidence. In the sync, the replies people rated highest were not the most detailed ones, they were the ones that answered in the same shape every time.\n\nSame order, same length, same place for the sources. Two participants said they stopped reading the whole answer once they trusted where the parts would be, which is the outcome you want.",
  },
  {
    match: ["pattern note", "draft the pattern"],
    title: "Pattern Note",
    duration: "11s",
    sourceIds: ["src_sync", "src_review"],
    followUps: ["What did they reject"],
    text: "Note, ready for the design review.\n\nName: reply to a sentence. Problem: feedback lands on a whole answer, so a correction throws away the parts that were right. Behaviour: selecting a sentence offers a reply scoped to it, and the quote rides into the composer where it can be removed.\n\nOpen question: what happens when the quoted sentence is later edited. Jonas thinks the quote should freeze. I think it should follow.",
  },
  {
    match: ["reject", "did they reject", "died"],
    title: "What They Rejected",
    duration: "6s",
    sourceIds: ["src_review"],
    followUps: ["Draft the pattern note"],
    text: "Anything numeric. A confidence percentage, a five point scale and a coloured reliability bar all read as a promise the assistant could not keep, and every participant who saw one brought it up unprompted later.\n\nThey also rejected the avatar. A face on the reply made people ask who was accountable, which is a fair question with a bad answer.",
  },
]

const FALLBACK_REPLIES: { title: string; duration: string; text: string }[] = [
  {
    title: "Needs Scope",
    duration: "3s",
    text: "Which of the two sessions do you mean? They ran a week apart with different prototypes, so the answers pull in opposite directions if I merge them.",
  },
  {
    title: "Not Covered",
    duration: "4s",
    text: "Nothing in either transcript covers that yet. Point me at the clip and I will pull it into the finding it belongs to.",
  },
  {
    title: "After Review",
    duration: "3s",
    text: "The pattern note is frozen until the design review on Thursday, so anything that changes the behaviour lands after it rather than in it.",
  },
]

/** Repeat sends rotate the fallback, so the demo never answers twice alike. */
export function draftReply(
  prompt: string,
  turn: number,
  quote?: string | null
): Omit<ChatMessageRecord, "id" | "role" | "at"> {
  const needle = prompt.toLowerCase()
  const hit = REPLY_LIBRARY.find((entry) =>
    entry.match.some((term) => needle.includes(term))
  )
  const base = hit ?? FALLBACK_REPLIES[turn % FALLBACK_REPLIES.length]
  // A quoted send is answered against that line, so the scope is visible in
  // the reply and not only in the composer that sent it.
  const text = quote
    ? `Scoped to the line you picked.\n\n${base.text}`
    : base.text
  return {
    title: base.title,
    duration: base.duration,
    text,
    followUps: hit?.followUps,
    sourceIds: hit?.sourceIds,
  }
}