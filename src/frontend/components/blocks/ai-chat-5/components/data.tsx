import type { ComponentType, ReactNode, SVGProps } from "react"

import { Clickup } from "@/components/ui/svgs/clickup"
import { Discord } from "@/components/ui/svgs/discord"
import { Dropbox } from "@/components/ui/svgs/dropbox"
import { GoogleCalendar } from "@/components/ui/svgs/googleCalendar"
import { GoogleDrive } from "@/components/ui/svgs/googleDrive"
import { GoogleMeet } from "@/components/ui/svgs/googleMeet"
import { Loom } from "@/components/ui/svgs/loom"
import { Slack } from "@/components/ui/svgs/slack"
import { Zoom } from "@/components/ui/svgs/zoom"
import { ListChecksIcon, PencilIcon, VideoIcon, SearchIcon } from "lucide-react"

export const ASSISTANT_NAME = "ReUI Chat"

export type AppId =
  | "drive"
  | "slack"
  | "calendar"
  | "dropbox"
  | "clickup"
  | "discord"
  | "meet"
  | "zoom"
  | "loom"

export type AppRecord = {
  id: AppId
  name: string
  /** The brand mark, held as a component so each site picks its own size. */
  logo: ComponentType<SVGProps<SVGSVGElement>>
  /** What connecting actually grants, spoken in the tooltip before the click. */
  scope: string
}

/** customize: your own integrations. Order is the order the strip renders. */
export const APPS: AppRecord[] = [
  {
    id: "drive",
    name: "Google Drive",
    logo: GoogleDrive,
    scope: "Docs and folders you can open",
  },
  {
    id: "slack",
    name: "Slack",
    logo: Slack,
    scope: "Public channels you have joined",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    logo: GoogleCalendar,
    scope: "Events and their attached notes",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    logo: Dropbox,
    scope: "Shared team folders",
  },
  {
    id: "clickup",
    name: "ClickUp",
    logo: Clickup,
    scope: "Lists, boards and task comments",
  },
  {
    id: "discord",
    name: "Discord",
    logo: Discord,
    scope: "Servers and channels you have joined",
  },
  {
    id: "meet",
    name: "Google Meet",
    logo: GoogleMeet,
    scope: "Recorded calls and their notes",
  },
  { id: "zoom", name: "Zoom", logo: Zoom, scope: "Recordings and transcripts" },
  { id: "loom", name: "Loom", logo: Loom, scope: "Walkthroughs you can view" },
]

/** The four that ship connected, so the screen opens with a working scope. */
export const CONNECTED_AT_START: AppId[] = [
  "drive",
  "slack",
  "calendar",
  "dropbox",
]

export type ModeId = "digest" | "draft" | "recap" | "audit"

export type ModeRecord = {
  id: ModeId
  label: string
  icon: ReactNode
  /** Dropped into the composer, so a mode arrives with a real question. */
  prompt: string
  /** The apps this job reads. A disconnected one turns into a skipped step. */
  steps: { app: AppId; label: string }[]
  /** Lands once every readable step has settled. */
  answer: string
}

export const MODES: ModeRecord[] = [
  {
    id: "digest",
    label: "Digest",
    icon: (
      <ListChecksIcon className="size-4" aria-hidden="true" />
    ),
    prompt: "Catch me up on the 3.4 release since Monday",
    steps: [
      { app: "slack", label: "Read 214 messages in #release" },
      { app: "calendar", label: "Matched 6 events on the ship calendar" },
    ],
    answer:
      "Two blockers cleared and one is still open. The webhook retry fix merged Tuesday, the migration rehearsal passed Wednesday, and the billing export is still waiting on a decision from Priya Nair.",
  },
  {
    id: "draft",
    label: "Draft",
    icon: (
      <PencilIcon className="size-4" aria-hidden="true" />
    ),
    prompt: "Draft the 3.4 release notes from the spec",
    steps: [
      { app: "drive", label: "Opened Release 3.4 spec, 14 pages" },
      { app: "dropbox", label: "Pulled 4 changelog exports" },
    ],
    answer:
      "Drafted three sections: what shipped, what moved, and the one breaking change Jonas Weber flagged. The webhook payload gains a retry_count field, so the upgrade note leads with it rather than burying it under the feature list.",
  },
  {
    id: "recap",
    label: "Recap",
    icon: (
      <VideoIcon className="size-4" aria-hidden="true" />
    ),
    prompt: "Recap Tuesday's call with Northwind",
    steps: [
      { app: "zoom", label: "Transcribed the Northwind call, 48 minutes" },
      { app: "meet", label: "Pulled the kickoff notes from Meet" },
      { app: "loom", label: "Watched the follow up walkthrough" },
    ],
    answer:
      "Northwind wants SSO before they renew, and they asked twice about export limits. The walkthrough answers the second one already, so the only open commitment is an SSO date.",
  },
  {
    id: "audit",
    label: "Audit",
    icon: (
      <SearchIcon className="size-4" aria-hidden="true" />
    ),
    prompt: "Find the contracts expiring this quarter",
    steps: [
      { app: "drive", label: "Scanned 312 files in Legal" },
      { app: "dropbox", label: "Checked the signed contracts folder" },
      { app: "clickup", label: "Cross read the renewals board" },
    ],
    answer:
      "Nine contracts expire before the quarter closes and four have no renewal owner. Northwind and Ardent are the two large ones, and both auto renew unless someone files notice by the 14th.",
  },
]

export type ModelRecord = {
  id: string
  name: string
  detail: string
}

/** customize: your own routing tiers. The first is the resting default. */
export const MODELS: ModelRecord[] = [
  { id: "auto", name: "Auto", detail: "Picks a model per question" },
  { id: "fast", name: "Fast", detail: "Short answers, lowest latency" },
  { id: "deep", name: "Deep", detail: "Reads more, answers slower" },
]

export type AttachmentRecord = {
  id: string
  name: string
  meta: string
}

/** Stands in for a file picker, so attaching stages something believable. */
export const COMPOSER_FILES: AttachmentRecord[] = [
  { id: "spec", name: "release-3.4-spec.pdf", meta: "PDF, 14 pages" },
  { id: "churn", name: "q3-churn.csv", meta: "CSV, 1,204 rows" },
  { id: "shot", name: "webhook-error.png", meta: "PNG, 1280x720" },
]