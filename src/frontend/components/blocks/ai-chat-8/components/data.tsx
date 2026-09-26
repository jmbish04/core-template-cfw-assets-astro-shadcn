import { CalendarIcon, ClockIcon, UsersIcon, PencilIcon, SparklesIcon } from "lucide-react";

export type PersonRecord = {
  name: string
  initials: string
  avatar: string
}

export const NORA: PersonRecord = {
  name: "Nora Vale",
  initials: "NV",
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

export const SARAH: PersonRecord = {
  name: "Sarah Chen",
  initials: "SC",
  avatar:
    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
}

export const OMAR: PersonRecord = {
  name: "Omar Haddad",
  initials: "OH",
  avatar:
    "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=96&h=96&dpr=2&q=80",
}

/** The person the panel opens for. */
export const VIEWER = NORA

export const ORG_NAME = "ReUI Labs"
export const ASSISTANT_NAME = "ReUI Chat"
export const COMPOSER_PLACEHOLDER = "Ask me anything"

/** The day an entry leaves for when it is pushed off Thursday. */
export const NEXT_DAY = "Friday"

/** Labels the top of the visible scrollback. */
export const THREAD_SEPARATOR = "Today"

export type EventRecord = {
  id: string
  title: string
  /** Minutes from midnight, so the view owns the clock format. */
  startsAt: number
  minutes: number
  /** Everyone besides the viewer; an empty list is focus time. */
  guests: PersonRecord[]
  /** Set once an entry has been pushed to another day. */
  movedTo?: string
}

/** The day before the assistant touches it. */
export const SCHEDULE: EventRecord[] = [
  {
    id: "ev_review",
    title: "Design Review",
    startsAt: 570,
    minutes: 45,
    guests: [MAYA, JONAS],
  },
  {
    id: "ev_sync",
    title: "Sync With Maya",
    startsAt: 690,
    minutes: 45,
    guests: [MAYA],
  },
  {
    id: "ev_strategy",
    title: "Strategy Session",
    startsAt: 750,
    minutes: 60,
    guests: [JONAS],
  },
  {
    id: "ev_roadmap",
    title: "Roadmap Draft",
    startsAt: 870,
    minutes: 30,
    guests: [],
  },
  {
    id: "ev_check",
    title: "1:1 With Omar",
    startsAt: 960,
    minutes: 30,
    guests: [OMAR],
  },
]

/** What the voice note is asking to fit in; nothing books it until Approve. */
export const PENDING_EVENT: EventRecord = {
  id: "ev_lunch",
  title: "Lunch With Sarah",
  startsAt: 720,
  minutes: 60,
  guests: [SARAH],
}

export function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const suffix = hour < 12 ? "AM" : "PM"
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${String(minutes % 60).padStart(2, "0")} ${suffix}`
}

export function formatLength(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return hours === 1 ? "1 hr" : `${hours} hr`
}

/** Seconds as a transport clock, so a voice note reads like a player. */
export function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

/** A turn flattened to plain text. Copy, the transcript export and the redo
    lookup all read a thread through this, so every shape answers here. */
export function turnText(turn: TurnRecord): string {
  switch (turn.kind) {
    case "voice":
      return turn.transcript
    case "asked":
    case "said":
      return turn.text
    case "steps":
      return [
        turn.lead,
        ...turn.steps.map((step) => `${step.label}: ${step.detail}`),
        turn.text,
      ].join("\n")
    case "roster":
      return [
        turn.lead,
        ...turn.people.map(
          (entry) =>
            `${entry.person.name}: ${AVAILABILITY_LABEL[entry.state]}, ${entry.detail}`
        ),
      ].join("\n")
    case "digest":
      return [
        turn.lead,
        ...turn.figures.map((figure) => `${figure.label}: ${figure.value}`),
        turn.note,
      ].join("\n")
    case "flag":
      return `${turn.title}\n${turn.detail}`
    case "plan":
    case "slots":
      return `${turn.lead}\n${turn.question}`
  }
}

export function eventTitle(schedule: EventRecord[], id: string) {
  return schedule.find((entry) => entry.id === id)?.title ?? ""
}

export type SourceRecord = {
  id: string
  title: string
  /** What the citation says under the title. */
  meta: string
}

/** The workspace documents the panel is allowed to quote. */
export const SOURCES: SourceRecord[] = [
  { id: "src_notes", title: "Design review notes", meta: "Edited 2 days ago" },
  { id: "src_policy", title: "Meeting policy", meta: "ReUI Labs handbook" },
  { id: "src_roadmap", title: "Q3 roadmap draft", meta: "Owned by Jonas" },
]

export function sourceById(id: string) {
  return SOURCES.find((entry) => entry.id === id)
}

export type MoveRecord = {
  /** Matches an EventRecord id, so Approve edits that entry in place. */
  eventId: string
  startsAt: number
  /** Set when the entry leaves the day rather than sliding within it. */
  day?: string
}

export type SlotRecord = {
  id: string
  startsAt: number
  minutes: number
  /** Set when the option is not on the day being viewed. */
  day?: string
  /** The cost of taking this one, so the choice is never blind. */
  detail: string
}

export type AvailabilityRecord = {
  person: PersonRecord
  state: "free" | "tentative" | "busy"
  detail: string
}

/** One word per state, shared by the badge and the copied text. */
export const AVAILABILITY_LABEL: Record<AvailabilityRecord["state"], string> = {
  free: "Free",
  tentative: "Maybe",
  busy: "Busy",
}

export type FigureRecord = {
  label: string
  value: string
}

export type StepRecord = {
  label: string
  detail: string
}

/** Every answer shape the panel knows how to draw. One branch per reply. */
export type ReplyBody =
  | {
      kind: "said"
      text: string
      /** Citation ids; the answer renders them as attachments underneath. */
      sourceIds?: string[]
      followUps?: string[]
    }
  | {
      kind: "plan"
      lead: string
      moves: MoveRecord[]
      /** Booked alongside the moves, so one Approve settles the whole ask. */
      addId: string
      question: string
    }
  | { kind: "slots"; lead: string; options: SlotRecord[]; question: string }
  | { kind: "roster"; lead: string; people: AvailabilityRecord[] }
  | { kind: "digest"; lead: string; figures: FigureRecord[]; note: string }
  | {
      kind: "flag"
      tone: "warning" | "destructive" | "success"
      title: string
      detail: string
      /** The callout's own button: a short label, and the ask it sends. */
      action?: { label: string; prompt: string }
    }
  | { kind: "steps"; lead: string; steps: StepRecord[]; text: string }

export type TurnRecord =
  | ({ id: string } & ReplyBody)
  | {
      id: string
      kind: "asked"
      text: string
      /** Meeting titles attached to the question, echoed under the bubble. */
      context?: string[]
    }
  | { id: string; kind: "voice"; seconds: number; transcript: string }

/** The thread as it stands when the panel opens, ending on an open decision. */
export const TURNS: TurnRecord[] = [
  {
    id: "t_hello",
    kind: "said",
    text: "Welcome back. How can I help?",
  },
  {
    id: "t_voice",
    kind: "voice",
    seconds: 18,
    transcript:
      "I've got a lunch with Sarah on Thursday at noon. Can you move things around so it fits?",
  },
  {
    id: "t_steps",
    kind: "steps",
    lead: "Checked the day before answering:",
    steps: [
      { label: "Read the calendar", detail: "5 entries on Thursday" },
      { label: "Found the clashes", detail: "2 sit on top of noon" },
      { label: "Checked the guests", detail: "Maya and Jonas are flexible" },
    ],
    text: "Both clashes can move without asking anyone to give up a morning.",
  },
  {
    id: "t_plan",
    kind: "plan",
    lead: "Here is what I would move:",
    moves: [
      { eventId: "ev_sync", startsAt: 810 },
      { eventId: "ev_strategy", startsAt: 900, day: NEXT_DAY },
    ],
    addId: PENDING_EVENT.id,
    question: "Shall I update your calendar and let them know?",
  },
]

/** Reads a list the way a person would say it. */
function joinNames(items: string[]) {
  if (items.length <= 1) return items[0] ?? ""
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

/** Says exactly what a settled plan did, so an approval never claims a move,
    a booking or a guest that plan never had. */
export function planSettledText(
  moved: string[],
  notified: string[],
  bookedTitle?: string
) {
  const parts = ["Booked."]
  if (moved.length) parts.push(`${joinNames(moved)} moved.`)
  if (bookedTitle) parts.push(`${bookedTitle} is on the calendar.`)
  if (notified.length) parts.push(`${joinNames(notified)} notified.`)
  return parts.join(" ")
}

export const PLAN_DECLINED =
  "Left as it was. Say the word and I will look for a free hour on Friday instead."

export type ThreadRecord = {
  id: string
  title: string
  at: string
  /** The last line of the thread, so the switcher is scannable. */
  preview: string
  turns: TurnRecord[]
}

/** Recent conversations, for the header switcher. Each one ends on a different
    answer shape, so switching is also a tour of what the panel can draw. */
export const THREADS: ThreadRecord[] = [
  {
    id: "th_today",
    title: "Thursday reshuffle",
    at: "Now",
    preview: "Two meetings sit on top of lunch",
    turns: TURNS,
  },
  {
    id: "th_review",
    title: "Design review recap",
    at: "Tue",
    preview: "Two decisions, one thread still open",
    turns: [
      {
        id: "th2_ask",
        kind: "asked",
        text: "What did I agree to in design review?",
      },
      {
        id: "th2_said",
        kind: "said",
        text: "Design review ran forty five minutes and closed on two decisions: the empty state ships without illustration, and the density toggle waits for 2.5. The third thread is still open because nobody committed to it.",
        sourceIds: ["src_notes", "src_roadmap"],
        followUps: ["Who owns the open thread", "Send this to the team"],
      },
    ],
  },
  {
    id: "th_hiring",
    title: "Hiring loop times",
    at: "Mon",
    preview: "Four panels, none of them overlap",
    turns: [
      {
        id: "th3_ask",
        kind: "asked",
        text: "Who is free at 3 today?",
      },
      {
        id: "th3_roster",
        kind: "roster",
        lead: "At 3 on Thursday:",
        people: [
          { person: MAYA, state: "free", detail: "Nothing booked until 4" },
          {
            person: OMAR,
            state: "free",
            detail: "Holds mornings, afternoons open",
          },
          {
            person: JONAS,
            state: "tentative",
            detail: "Customer call may run over",
          },
          {
            person: SARAH,
            state: "busy",
            detail: "Booked solid after lunch",
          },
        ],
      },
    ],
  },
]

export type StarterRecord = {
  id: string
  label: string
  /** What the chip actually sends, so the reply matches the label. */
  prompt: string
  icon: React.ReactNode
}

/** The zero state's way in, scoped to the day the panel is looking at. */
export const STARTERS: StarterRecord[] = [
  {
    id: "st_gap",
    label: "Find A Gap",
    prompt: "Find a free hour on Thursday",
    icon: (
      <CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
    ),
  },
  {
    id: "st_afternoon",
    label: "Clear My Afternoon",
    prompt: "Clear my afternoon and tell me who to warn",
    icon: (
      <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
    ),
  },
  {
    id: "st_who",
    label: "Who Is Free",
    prompt: "Who is free at 3 today",
    icon: (
      <UsersIcon className="size-4 shrink-0" aria-hidden="true" />
    ),
  },
  {
    id: "st_recap",
    label: "Draft The Recap",
    prompt: "Draft the recap for design review",
    icon: (
      <PencilIcon className="size-4 shrink-0" aria-hidden="true" />
    ),
  },
  {
    id: "st_prep",
    label: "Prep My Day",
    prompt: "Prep my day and flag anything at risk",
    icon: (
      <SparklesIcon className="size-4 shrink-0" aria-hidden="true" />
    ),
  },
]

export type ModelRecord = {
  id: string
  name: string
  /** What the picker says under the name. */
  detail: string
}

export const MODELS: ModelRecord[] = [
  { id: "swift", name: "Swift 2.4", detail: "Answers in a breath" },
  { id: "studio", name: "Studio 2.4", detail: "Reads the whole calendar" },
]

export type ModeRecord = {
  id: string
  name: string
  detail: string
}

export const MODES: ModeRecord[] = [
  { id: "ask", name: "Ask", detail: "Answers, never edits" },
  { id: "act", name: "Act", detail: "Proposes edits you approve" },
]

type ReplyEntry = {
  match: string[]
  body: ReplyBody
  /** The second take, reached only by Try again, so a fresh ask always gets
      the canonical shape first. */
  alt?: ReplyBody
}

/** Specific terms first: a greedy term up top would eat the other prompts. */
const REPLY_LIBRARY: ReplyEntry[] = [
  {
    match: ["roadmap", "hour back", "end of the day"],
    body: {
      kind: "plan",
      lead: "One move does it:",
      moves: [{ eventId: "ev_roadmap", startsAt: 990 }],
      addId: "",
      question: "Move it and run clear from 1:30?",
    },
  },
  {
    match: ["1:1", "omar", "earlier", "thirty minutes"],
    body: {
      kind: "slots",
      lead: "Omar is open three times before noon:",
      options: [
        {
          id: "sl_early",
          startsAt: 540,
          minutes: 30,
          detail: "Before Design Review",
        },
        {
          id: "sl_mid",
          startsAt: 645,
          minutes: 30,
          detail: "Straight after Design Review",
        },
        {
          id: "sl_fri",
          startsAt: 540,
          minutes: 30,
          day: NEXT_DAY,
          detail: "Keeps Thursday untouched",
        },
      ],
      question: "Which one should I send?",
    },
  },
  {
    match: ["who is free", "who is available", "at 3"],
    alt: {
      kind: "said",
      text: "Maya and Omar can both take 3. Jonas is the one to ask rather than book, because his customer call has run over twice this month.",
      followUps: ["Book Maya and Omar", "Ask Jonas first"],
    },
    body: {
      kind: "roster",
      lead: "At 3 on Thursday:",
      people: [
        { person: MAYA, state: "free", detail: "Nothing booked until 4" },
        {
          person: OMAR,
          state: "free",
          detail: "Holds mornings, afternoons open",
        },
        {
          person: JONAS,
          state: "tentative",
          detail: "Customer call may run over",
        },
        { person: SARAH, state: "busy", detail: "Booked solid after lunch" },
      ],
    },
  },
  {
    match: ["how much", "meetings", "load", "booked"],
    alt: {
      kind: "flag",
      tone: "warning",
      title: "Thursday Is Heavy",
      detail:
        "Three and a half hours of meetings against three and a half clear. Two more requests and the morning stretch is gone.",
      action: { label: "Hold It", prompt: "Hold that hour for me" },
    },
    body: {
      kind: "digest",
      lead: "Thursday, by the numbers:",
      figures: [
        { label: "Meetings", value: "5" },
        { label: "In meetings", value: "3.5 hr" },
        { label: "Longest gap", value: "1 hr 15" },
      ],
      note: "The longest clear stretch is 10:15 to 11:30, before your sync with Maya.",
    },
  },
  {
    match: ["prep", "at risk", "my day"],
    body: {
      kind: "flag",
      tone: "warning",
      title: "One Meeting At Risk",
      detail:
        "Strategy Session has no agenda and Jonas is the only guest, so it reads like a status call. The rest of the day is fine.",
      action: { label: "Ask Jonas", prompt: "Ask Jonas for an agenda" },
    },
  },
  {
    match: ["agenda", "jonas", "dropping it", "ask jonas"],
    body: {
      kind: "flag",
      tone: "success",
      title: "Message Sent",
      detail:
        "Jonas has until 5 to attach an agenda. Strategy Session comes back to you Friday morning either way.",
    },
  },
  {
    match: ["recap", "draft the", "notes", "agreed"],
    alt: {
      kind: "steps",
      lead: "Rebuilt the recap from the source:",
      steps: [
        { label: "Read the notes", detail: "18 lines, 2 decisions" },
        { label: "Matched the owners", detail: "Maya and Jonas signed off" },
        { label: "Flagged the gap", detail: "Thread three has no owner" },
      ],
      text: "Same two decisions. The open thread is the only thing that needs a name against it before this goes out.",
    },
    body: {
      kind: "said",
      text: "Design review ran forty five minutes and closed on two decisions: the empty state ships without illustration, and the density toggle waits for 2.5. The third thread is still open because nobody committed to it.",
      sourceIds: ["src_notes", "src_roadmap"],
      followUps: ["Who owns the open thread", "Send this to the team"],
    },
  },
  {
    match: ["clear my afternoon", "afternoon"],
    body: {
      kind: "steps",
      lead: "Worked through the afternoon:",
      steps: [
        { label: "Read the entries", detail: "3 after 12:30" },
        { label: "Checked the history", detail: "Omar moved twice already" },
        { label: "Sorted by cost", detail: "Roadmap Draft is yours alone" },
      ],
      text: "Roadmap Draft is yours to cancel outright. I would keep the 1:1 with Omar and tell him you are running short.",
    },
  },
  {
    match: ["free hour", "find a gap", "gap", "free at"],
    alt: {
      kind: "digest",
      lead: "Where Thursday actually goes:",
      figures: [
        { label: "Booked", value: "3.5 hr" },
        { label: "Clear", value: "3.5 hr" },
        { label: "Gaps", value: "4" },
      ],
      note: "The longest clear stretch is 75 minutes. The shortest is fifteen.",
    },
    body: {
      kind: "said",
      text: "Three gaps run over an hour: 10:15 to 11:30, 1:30 to 2:30, and 3:00 to 4:00. The morning one is longest at 75 minutes.",
      followUps: ["Hold that hour for me", "What about Friday"],
    },
  },
  {
    match: ["hold that hour", "hold the hour", "block it"],
    body: {
      kind: "flag",
      tone: "success",
      title: "Hour Held",
      detail:
        "10:15 to 11:30 on Thursday is blocked as focus time. Nobody can book over it without asking you first.",
    },
  },
  {
    match: ["policy", "rule", "allowed", "can you"],
    body: {
      kind: "said",
      text: "I can move anything you own and anything where you are the only required guest. Meetings owned by someone else I can only draft a message about.",
      sourceIds: ["src_policy"],
    },
  },
  {
    match: ["lunch", "sarah", "noon", "fit"],
    body: {
      kind: "plan",
      lead: "Two meetings sit on top of it. Here is what I would move:",
      moves: [
        { eventId: "ev_sync", startsAt: 810 },
        { eventId: "ev_strategy", startsAt: 900, day: NEXT_DAY },
      ],
      addId: PENDING_EVENT.id,
      question: "Shall I update your calendar and let them know?",
    },
  },
]

/** Rotated when nothing matches, so a demo never answers twice alike. Each is
    a different shape on purpose: the panel should never look one note. */
const FALLBACK_REPLIES: ReplyBody[] = [
  {
    kind: "said",
    text: "Nothing on Thursday covers that. Point me at the meeting and I will work from its invite.",
    followUps: ["Show me Thursday", "Who is free at 3"],
  },
  {
    kind: "flag",
    tone: "destructive",
    title: "Outside My Reach",
    detail:
      "That calendar is not connected, so I can read it but I cannot change anything on it.",
  },
  {
    kind: "digest",
    lead: "What I can see right now:",
    figures: [
      { label: "Days", value: "1" },
      { label: "Entries", value: "5" },
      { label: "Sources", value: "3" },
    ],
    note: "Connect another calendar and the same answers cover both.",
  },
]

/** Answers a prompt. `take` walks the alternates, so 0 is always the canonical
    answer and Try again asks for the next; `turn` rotates the fallback. */
export function composeReply(prompt: string, turn = 0, take = 0): ReplyBody {
  const needle = prompt.toLowerCase()
  const hit = REPLY_LIBRARY.find((entry) =>
    entry.match.some((term) => needle.includes(term))
  )
  if (!hit) return FALLBACK_REPLIES[turn % FALLBACK_REPLIES.length]
  const takes = hit.alt ? [hit.body, hit.alt] : [hit.body]
  return takes[take % takes.length]
}

/** Specific terms first: a greedy term up top would eat the other prompts. */
const ACTIVITY_LABELS: { match: string[]; label: string }[] = [
  {
    match: ["move", "fit", "clash", "reschedule"],
    label: "Checking for clashes",
  },
  {
    match: ["free", "gap", "available", "who is"],
    label: "Scanning for open time",
  },
  {
    match: ["recap", "notes", "draft", "agreed"],
    label: "Reading the meeting notes",
  },
  { match: ["tell", "agenda", "book", "send"], label: "Drafting the message" },
  { match: ["how much", "load", "booked"], label: "Adding up the day" },
]

/** What the thinking row says. Swap for the step your backend reports. */
export function activityFor(prompt: string) {
  const needle = prompt.toLowerCase()
  const hit = ACTIVITY_LABELS.find((entry) =>
    entry.match.some((term) => needle.includes(term))
  )
  return hit?.label ?? "Reading your calendar"
}

/** What a fresh voice note transcribes to, so the mic has somewhere to land. */
export const DICTATED = [
  "Push the roadmap draft to the end of the day and give me the hour back.",
  "Move my 1:1 with Omar earlier if he has anything before noon.",
  "How much of Thursday is actually meetings?",
]