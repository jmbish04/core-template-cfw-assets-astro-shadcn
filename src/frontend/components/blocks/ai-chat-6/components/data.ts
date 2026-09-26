export type PersonRecord = {
  id: string
  name: string
  initials: string
  avatar: string
}

export const PRIYA: PersonRecord = {
  id: "p_priya",
  name: "Priya Nair",
  initials: "PN",
  avatar:
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
}

export const MAYA: PersonRecord = {
  id: "p_maya",
  name: "Maya Chen",
  initials: "MC",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
}

export const JONAS: PersonRecord = {
  id: "p_jonas",
  name: "Jonas Weber",
  initials: "JW",
  avatar:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
}

export const SAM: PersonRecord = {
  id: "p_sam",
  name: "Sam Okafor",
  initials: "SO",
  avatar:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&dpr=2&q=80",
}

/** The product lead the panel opens for. */
export const VIEWER = PRIYA

export const ORG_NAME = "ReUI Labs"
export const ASSISTANT_NAME = "ReUI Chat"
export const COMPOSER_PLACEHOLDER = "Ask about the signup drop"

/** The first turn is stamped here and every later turn counts on from it. */
const CLOCK_START_MINUTES = 9 * 60 + 41

/** Wall clock for a demo with no clock: one format for every turn, so the
    timestamp column never mixes "09:41" with a relative word. */
export function clockAt(offsetMinutes: number) {
  const total = CLOCK_START_MINUTES + offsetMinutes
  const hours = Math.floor(total / 60) % 24
  const minutes = total % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export type ModelRecord = {
  id: string
  name: string
  provider: string
  /** Context window label. */
  context: string
  capability: string
  /** Called out in the picker as the default for most work. */
  recommended?: boolean
}

export const MODELS: ModelRecord[] = [
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    context: "200K",
    capability: "Reasoning",
    recommended: true,
  },
  {
    id: "gpt-5-1",
    name: "GPT-5.1",
    provider: "OpenAI",
    context: "256K",
    capability: "Balanced",
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    context: "1M",
    capability: "Long input",
  },
  {
    id: "haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    context: "200K",
    capability: "Fast",
  },
]

/** Picks the row icon in every context list. */
export type SourceKind = "upload" | "metrics" | "replay" | "tickets" | "doc"

export type SourceRecord = {
  id: string
  title: string
  /** The line under the title: scope, size, or freshness. */
  meta: string
  kind: SourceKind
  /** True for a file the reader attached rather than a workspace index. */
  attached?: boolean
}

/** Everything the agent is allowed to read. The first entry rides in with the
    opening message, so an attached file and an indexed source are one list. */
export const SOURCES: SourceRecord[] = [
  {
    id: "src_upload",
    title: "funnel-export.csv",
    meta: "CSV, 1,204 rows",
    kind: "upload",
    attached: true,
  },
  {
    id: "src_funnel",
    title: "Signup funnel",
    meta: "Analytics, last 14 days",
    kind: "metrics",
  },
  {
    id: "src_tickets",
    title: "Support queue",
    meta: "14 tickets tagged signup",
    kind: "tickets",
  },
  {
    id: "src_replay",
    title: "Session replay",
    meta: "18 signups, Aug 25",
    kind: "replay",
  },
]

/** What the agent proposes to read before the reader touches anything. */
export const DEFAULT_CONTEXT_IDS = ["src_upload", "src_funnel", "src_tickets"]

export function sourcesFor(ids: string[]) {
  return SOURCES.filter((source) => ids.includes(source.id))
}

/** Picks the icon a file chip shows. Kept as data because IconPlaceholder
    needs static names, so the view holds the nodes and the record holds this. */
export type FileKind = "doc" | "data" | "image"

/** One question in the brief the agent asks before it starts. */
export type BriefChoiceRecord = {
  value: string
  label: string
  hint?: string
  /** Pre-picked, so the reader confirms a proposal instead of filling a form. */
  preset?: boolean
}

export type BriefQuestionRecord = {
  name: string
  title: string
  /** True for a question that takes more than one answer. */
  multiple?: boolean
  choices: BriefChoiceRecord[]
}

export const BRIEF_SOURCES = "sources"
export const BRIEF_DEPTH = "depth"
export const BRIEF_DEADLINE = "deadline"

/** The brief. Every answer changes something downstream: the sources set the
    context, the depth pre-selects the plan, the deadline sets the due date. */
export const BRIEF_QUESTIONS: BriefQuestionRecord[] = [
  {
    name: BRIEF_SOURCES,
    title: "What may I read?",
    multiple: true,
    choices: SOURCES.map((source) => ({
      value: source.id,
      label: source.title,
      hint: source.attached ? `Attached, ${source.meta}` : source.meta,
      preset: DEFAULT_CONTEXT_IDS.includes(source.id),
    })),
  },
  {
    name: BRIEF_DEPTH,
    title: "How far should I take it?",
    choices: [
      { value: "cause", label: "Find the cause", hint: "Read and report back" },
      {
        value: "fix",
        label: "Find it and draft a fix",
        hint: "Adds the drafting steps",
      },
      {
        value: "handoff",
        label: "Draft it and hand it off",
        hint: "Adds the review note",
        preset: true,
      },
    ],
  },
  {
    name: BRIEF_DEADLINE,
    title: "When is this needed?",
    choices: [
      {
        value: "due_thu",
        label: "Before Thursday's review",
        hint: "Aug 27",
        preset: true,
      },
      { value: "due_fri", label: "End of the week", hint: "Aug 28" },
      { value: "due_mon", label: "Early next week", hint: "Aug 31" },
    ],
  },
]

/** What the confirmed brief says it agreed to, in one line per answer. */
export function briefSummary(question: string, values: string[]) {
  const record = BRIEF_QUESTIONS.find((entry) => entry.name === question)
  if (!record) return ""
  return values
    .map(
      (value) =>
        record.choices.find((choice) => choice.value === value)?.label ?? value
    )
    .join(", ")
}

/** A file the reader stages on the next message. */
export type FileRecord = {
  id: string
  name: string
  meta: string
  kind: FileKind
}

/** Stands in for a file picker, so attaching stages something believable. */
export const PICKABLE_FILES: FileRecord[] = [
  {
    id: "file_spec",
    name: "onboarding-spec-v3.pdf",
    meta: "PDF, 11 pages",
    kind: "doc",
  },
  {
    id: "file_events",
    name: "verify-events.json",
    meta: "JSON, 8,410 events",
    kind: "data",
  },
  {
    id: "file_shot",
    name: "verify-screen.png",
    meta: "PNG, 1280x720",
    kind: "image",
  },
]

/** The file that arrived with the opening question. */
export const OPENING_FILE: FileRecord = {
  id: "file_funnel",
  name: "funnel-export.csv",
  meta: "CSV, 1,204 rows",
  kind: "data",
}

/** Something the run produced. Artifacts are outputs, so they arrive on the
    step that made them and ride along to the ticket at the end. */
export type ArtifactRecord = {
  id: string
  name: string
  meta: string
}

/** Which branch of the fork a step belongs to. Untagged steps always run. */
export type PlanBranch = "order" | "delivery"

export type PlanStepRecord = {
  id: string
  title: string
  detail: string
  /** How long the step takes on screen, and the runtime it reports once it
      lands. Seconds, so the plan can total its own steps. */
  runMs: number
  tookSeconds: number
  /** Set on the step that fails the first time it is run. */
  failure?: string
  /** Branch steps wait for the answer to the fork before they can run. */
  branch?: PlanBranch
  artifact?: ArtifactRecord
}

export const PLAN_STEPS: PlanStepRecord[] = [
  {
    id: "step_logs",
    title: "Pull Verification Logs",
    detail: "Delivery and bounce rate by provider",
    runMs: 1400,
    tookSeconds: 4,
    artifact: {
      id: "art_log",
      name: "verification-log.csv",
      meta: "CSV, 6,204 rows",
    },
  },
  {
    id: "step_compare",
    title: "Compare Releases",
    detail: "Step order and drop off per screen",
    runMs: 1800,
    tookSeconds: 6,
    failure: "The 4.1 snapshot expired. Rebuilding it takes a minute.",
  },
  {
    id: "step_order",
    title: "Draft Reorder",
    detail: "Move verification after workspace setup",
    runMs: 1600,
    tookSeconds: 5,
    branch: "order",
    artifact: {
      id: "art_order",
      name: "verify-order.patch",
      meta: "Patch, 2 files",
    },
  },
  {
    id: "step_delivery",
    title: "Draft Resend Rule",
    detail: "Retry a code that never arrives",
    runMs: 1500,
    tookSeconds: 4,
    branch: "delivery",
    artifact: {
      id: "art_resend",
      name: "resend-rule.patch",
      meta: "Patch, 1 file",
    },
  },
  {
    id: "step_note",
    title: "Write Review Note",
    detail: "One page for Thursday",
    runMs: 1200,
    tookSeconds: 3,
    artifact: { id: "art_note", name: "review-note.md", meta: "MD, 1 page" },
  },
]

/** Steps with no branch tag survive every answer to the fork. */
export const ALL_STEP_IDS = PLAN_STEPS.map((step) => step.id)

/** Steps each depth answer switches on. Anything not listed stays off. */
export const DEPTH_STEPS: Record<string, string[]> = {
  cause: ["step_logs", "step_compare"],
  fix: ["step_logs", "step_compare", "step_order", "step_delivery"],
  handoff: ALL_STEP_IDS,
}

/** The question the run stops to ask. One decision, so it reads as a fork in
    the work rather than a form the reader has to fill in. */
export type ForkChoiceRecord = {
  value: string
  label: string
  hint: string
  /** Branch steps this answer keeps. Everything else is switched off. */
  keeps: PlanBranch[]
}

export const FORK_NAME = "root-cause"

export const FORK_CHOICES: ForkChoiceRecord[] = [
  {
    value: "order",
    label: "Verification runs too early",
    hint: "4.2 moved it ahead of workspace setup",
    keeps: ["order"],
  },
  {
    value: "delivery",
    label: "Codes are not arriving",
    hint: "11 tickets say the mail never landed",
    keeps: ["delivery"],
  },
  {
    value: "both",
    label: "Take both forward",
    hint: "Drafts two changes, one review note",
    keeps: ["order", "delivery"],
  },
]

export function branchesFor(value: string) {
  return FORK_CHOICES.find((choice) => choice.value === value)?.keeps ?? []
}

/** Who the finished work can be handed to. */
export const OWNERS: PersonRecord[] = [JONAS, MAYA, SAM, PRIYA]

export type DueOption = { id: string; label: string }

export const DUE_OPTIONS: DueOption[] = [
  { id: "due_thu", label: "Thursday, Aug 27" },
  { id: "due_fri", label: "Friday, Aug 28" },
  { id: "due_mon", label: "Monday, Aug 31" },
]

/** The ticket the hand off creates. Point this at your own tracker. */
export const TASK_ID = "PRD-482"
export const TASK_TITLE = "Recover signup completion after 4.2"
export const TASK_LINK = "https://reui.app/t/PRD-482"

/** The tool an answer hands the reader so the task can move forward. */
export type WidgetKind = "context" | "plan" | "fork" | "handoff"

export type ChatMessageRecord = {
  id: string
  role: "user" | "assistant"
  at: string
  /** Paragraphs split on a blank line. Backticks render as inline code. */
  text: string
  /** Assistant only: what the answer is called, and how long it took. */
  title?: string
  duration?: string
  /** Assistant only: the model that produced it. Absent on the scripted turns,
      which were answered before the reader could pick one. */
  model?: string
  /** Assistant only: the control this answer carries under its text. */
  widget?: WidgetKind
  /** User only: files that rode in with the message. */
  fileIds?: string[]
  /** Assistant only: a config change the answer drafted. */
  code?: { filename: string; language: string; body: string }
  followUps?: string[]
}

/** Labels the top of the visible scrollback. */
export const THREAD_SEPARATOR = "Today"

export const OPENING_TURN: ChatMessageRecord = {
  id: "m_ask",
  role: "user",
  at: clockAt(0),
  text: "Signup completion dropped 12% after 4.2 shipped on Tuesday. Work out what changed and get a fix moving before Thursday's review.",
  fileIds: [OPENING_FILE.id],
}

/** Delivered after the thinking beat, so the reveal happens on screen. */
export const SCOPE_REPLY: ChatMessageRecord = {
  id: "m_scope",
  role: "assistant",
  at: clockAt(0),
  title: "Scoping the Drop",
  duration: "4s",
  widget: "context",
  text: "Your export agrees with the funnel: completion fell from 71% to 59% between Monday and Wednesday, and all of it sits on the email verification step.\n\nThree questions before I start. I have pre-picked what I would choose, so confirming is enough.",
}

export const FINDINGS_REPLY: ChatMessageRecord = {
  id: "m_findings",
  role: "assistant",
  at: clockAt(2),
  title: "What Changed",
  duration: "11s",
  widget: "plan",
  text: "Two things line up. Release 4.2 moved verification ahead of the workspace step, so people now hit an inbox check 40 seconds in. `verify_sent` fires for every signup, but only 61% of them come back, and 11 of this week's 14 tickets say the code never arrived.\n\nHere is how I would take it from here. Turn off any step you want skipped, then run it.",
}

/** Raised mid run, which is why it has no plan under it: the plan is paused
    behind this turn and resumes on the answer. */
export const FORK_REPLY: ChatMessageRecord = {
  id: "m_fork",
  role: "assistant",
  at: clockAt(4),
  title: "Two Candidates",
  duration: "6s",
  widget: "fork",
  text: "The release comparison came back with two causes, and they need different fixes. I have paused the run rather than guess.",
}

/** The fix depends on the branch the reader took, so the closing answer cannot
    contradict the decision it was given. */
const FIX_BODIES: Record<string, { text: string; code: string }> = {
  order: {
    text: "Delivery holds up on its own: 99.2% of codes send and bounces are flat. The order is what broke. In 4.1 people verified after they had a workspace to come back to, so an abandoned inbox check cost nothing. In 4.2 it ends the signup.\n\nOne flag moves verification back behind workspace setup. Assign it and the files the run produced follow it to the ticket.",
    code: "export const onboardingFlags = {\n  verifyAfterWorkspace: true,\n}\n",
  },
  delivery: {
    text: "The mail is the problem you picked, and the queue agrees: 11 of this week's 14 tickets say the code never landed, and the median gap between `verify_sent` and a retry is over four minutes.\n\nOne flag resends a code that goes unused for 90 seconds. Assign it and the files the run produced follow it to the ticket.",
    code: "export const onboardingFlags = {\n  verifyResendAfterSeconds: 90,\n}\n",
  },
  both: {
    text: "Both hold up. Verification moved ahead of workspace setup in 4.2, so an abandoned inbox check now ends the signup, and 11 of this week's 14 tickets say the code never landed at all.\n\nTwo flags, one review note. Assign it and the files the run produced follow it to the ticket.",
    code: "export const onboardingFlags = {\n  verifyAfterWorkspace: true,\n  verifyResendAfterSeconds: 90,\n}\n",
  },
}

/** Lines the diff marks as added, so the flags the branch introduces read as
    the change rather than as context. */
export function fixAddedLines(value: string | null) {
  return value === "both" ? [2, 3] : [2]
}

export function fixReplyFor(value: string | null): ChatMessageRecord {
  const body = FIX_BODIES[value ?? "both"] ?? FIX_BODIES.both
  return {
    id: "m_fix",
    role: "assistant",
    at: clockAt(6),
    title: "Fix Ready",
    duration: "24s",
    widget: "handoff",
    code: {
      filename: "onboarding.flags.ts",
      language: "typescript",
      body: body.code,
    },
    text: body.text,
  }
}

/** Every shape the fix answer can take, so a Retry can restore the right one. */
export const FIX_REPLY_IDS = ["m_fix"]

export const CREATED_REPLY: ChatMessageRecord = {
  id: "m_created",
  role: "assistant",
  at: clockAt(7),
  title: "Handed Off",
  duration: "1s",
  text: "Everything the run produced is on the ticket. I will check completion again on Monday and flag it here if it has not recovered.",
  followUps: ["Show the drop by step", "Draft the rollout message"],
}

/** New chat parks the panel here, so the zero state offers real work. */
export const STARTERS: string[] = [
  "Why did signup completion drop?",
  "Which release touched onboarding?",
  "Summarise this week's support tickets",
]

/** Answers a freely typed message. Grounded in whatever is in context, so the
    reply names the count rather than pretending to know more. */
export function draftReply(
  prompt: string,
  serial: number,
  contextCount: number,
  model: string
): Pick<ChatMessageRecord, "title" | "duration" | "text" | "model"> {
  const scope = contextCount
    ? `the ${contextCount} ${contextCount === 1 ? "source" : "sources"} in context`
    : "the workspace index"
  return {
    model,
    title: serial % 2 === 0 ? "Checked Again" : "Reading Context",
    duration: serial % 2 === 0 ? "6s" : "3s",
    text: `Reading ${scope} for "${prompt.length > 72 ? `${prompt.slice(0, 69)}...` : prompt}".\n\nThe signal is the same one behind the drop: verification now runs before anyone has a workspace to return to. Everything else on the funnel held its rate through the release.`,
  }
}

/** Stands in for an answer the reader cut short. */
export const STOPPED_NOTE: Pick<
  ChatMessageRecord,
  "title" | "duration" | "text"
> = {
  title: "Stopped",
  duration: "0s",
  text: "Stopped before anything came back. Ask again and I will pick it up from the same context.",
}