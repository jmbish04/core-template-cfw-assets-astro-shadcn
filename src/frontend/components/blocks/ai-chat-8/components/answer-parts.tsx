import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
import { cn } from "@/lib/utils"

import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentTitle,
} from "@/components/ui/attachment"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@/components/ui/marker"
import {
  AVAILABILITY_LABEL,
  sourceById,
  type AvailabilityRecord,
  type FigureRecord,
  type SourceRecord,
  type StepRecord,
} from "./data"
import { FileTextIcon, CheckIcon, CornerDownRightIcon, TriangleAlertIcon, CircleXIcon, CircleCheckIcon } from "lucide-react"

const ICON_FILE = (
  <FileTextIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_STEP = (
  <CheckIcon className="size-3.5" aria-hidden="true" />
)

const ICON_FOLLOW = (
  <CornerDownRightIcon className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
)

const ICON_WARNING = (
  <TriangleAlertIcon aria-hidden="true" />
)

const ICON_BLOCKED = (
  <CircleXIcon aria-hidden="true" />
)

const ICON_DONE = (
  <CircleCheckIcon aria-hidden="true" />
)

/** Two parallel maps beside the shared label, the house shape for a status
    badge: variant carries the tone, the dot the glance, the word the meaning. */
const AVAILABILITY_VARIANT: Record<
  AvailabilityRecord["state"],
  "success-outline" | "warning-outline" | "outline"
> = {
  free: "success-outline",
  tentative: "warning-outline",
  busy: "outline",
}

const AVAILABILITY_DOT: Record<AvailabilityRecord["state"], string> = {
  free: "bg-success",
  tentative: "bg-warning",
  busy: "bg-muted-foreground/50",
}

/** Documents an answer quoted from, so a claim can be traced back. */
export function SourceList({ ids }: { ids: string[] }) {
  const sources = ids
    .map(sourceById)
    .filter((source): source is SourceRecord => Boolean(source))
  if (!sources.length) return null

  return (
    <AttachmentGroup className="flex-wrap gap-1.5">
      {sources.map((source) => (
        <Attachment key={source.id} size="xs" className="max-w-56 gap-2">
          <span className="text-muted-foreground">{ICON_FILE}</span>
          <AttachmentContent>
            <AttachmentTitle>{source.title}</AttachmentTitle>
            <AttachmentDescription>{source.meta}</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      ))}
    </AttachmentGroup>
  )
}

/** The next question, offered rather than waited for. */
export function FollowUps({
  prompts,
  onSend,
}: {
  prompts: string[]
  onSend: (prompt: string) => void
}) {
  if (!prompts.length) return null

  return (
    <div className="flex flex-col gap-1">
      {prompts.map((prompt) => (
        <Button
          key={prompt}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSend(prompt)}
          className="text-muted-foreground hover:text-foreground h-auto w-fit justify-start gap-2 px-2 py-1 text-xs font-normal"
        >
          {ICON_FOLLOW}
          <span className="min-w-0 truncate">{prompt}</span>
        </Button>
      ))}
    </div>
  )
}

/** Who is around, with the cost of each answer next to the name. */
export function RosterTurn({
  lead,
  people,
}: {
  lead: string
  people: AvailabilityRecord[]
}) {
  return (
    <Bubble variant="outline" className="max-w-full">
      <BubbleContent className="flex flex-col gap-2 px-2 py-2">
        <p className="px-1 text-sm leading-relaxed">{lead}</p>
        <div className="flex flex-col">
          {people.map((entry) => (
            <Item
              key={entry.person.name}
              size="sm"
              className="gap-2.5 px-1 py-1.5"
            >
              <ItemMedia>
                <Avatar className="size-7">
                  <AvatarImage
                    src={entry.person.avatar}
                    alt={entry.person.name}
                  />
                  <AvatarFallback className="text-[10px]">
                    {entry.person.initials}
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent className="min-w-0 gap-0">
                <ItemTitle className="min-w-0 truncate">
                  {entry.person.name}
                </ItemTitle>
                <ItemDescription className="min-w-0 truncate">
                  {entry.detail}
                </ItemDescription>
              </ItemContent>
              <Badge variant={AVAILABILITY_VARIANT[entry.state]}>
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full!",
                    AVAILABILITY_DOT[entry.state]
                  )}
                />
                {AVAILABILITY_LABEL[entry.state]}
              </Badge>
            </Item>
          ))}
        </div>
      </BubbleContent>
    </Bubble>
  )
}

/** The figures that answer a "how much" question, and what they add up to. */
export function DigestTurn({
  lead,
  figures,
  note,
}: {
  lead: string
  figures: FigureRecord[]
  note: string
}) {
  return (
    <Bubble variant="outline" className="max-w-full">
      <BubbleContent className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed">{lead}</p>
        <div className="flex items-end gap-4">
          {figures.map((figure) => (
            <div key={figure.label} className="flex min-w-0 flex-col gap-0.5">
              <span className="text-lg leading-none font-semibold tabular-nums">
                {figure.value}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {figure.label}
              </span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{note}</p>
      </BubbleContent>
    </Bubble>
  )
}

/** A result that needs to stand out from the prose around it. */
export function FlagTurn({
  tone,
  title,
  detail,
  action,
  onSend,
}: {
  tone: "warning" | "destructive" | "success"
  title: string
  detail: string
  /** The callout's own button, when it offers one. */
  action?: { label: string; prompt: string }
  onSend: (prompt: string) => void
}) {
  return (
    <Alert variant={tone}>
      {tone === "warning" ? ICON_WARNING : null}
      {tone === "destructive" ? ICON_BLOCKED : null}
      {tone === "success" ? ICON_DONE : null}
      <AlertTitle>{title}</AlertTitle>
      {action ? (
        // The primitive parks the action beside the title, which is right in a
        // full width alert and wrong in a panel; drop it under the text.
        <AlertAction className="mt-2 sm:col-start-2 sm:row-start-3 sm:justify-start sm:self-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSend(action.prompt)}
          >
            {action.label}
          </Button>
        </AlertAction>
      ) : null}
      <AlertDescription>{detail}</AlertDescription>
    </Alert>
  )
}

/** What the panel did before it answered, so the answer can be trusted. */
export function StepsTurn({
  lead,
  steps,
  children,
}: {
  lead: string
  steps: StepRecord[]
  /** The answer itself, revealed by the caller. */
  children: React.ReactNode
}) {
  return (
    <Bubble variant="outline" className="max-w-full">
      <BubbleContent className="flex flex-col gap-2.5">
        <p className="text-sm leading-relaxed">{lead}</p>
        <div className="flex flex-col gap-1.5">
          {steps.map((step) => (
            <Marker key={step.label}>
              <MarkerIcon className="text-success">{ICON_STEP}</MarkerIcon>
              <MarkerContent className="flex min-w-0 items-center gap-1.5">
                <span className="text-foreground shrink-0">{step.label}</span>
                <span
                  aria-hidden="true"
                  className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
                />
                <span className="min-w-0 truncate">{step.detail}</span>
              </MarkerContent>
            </Marker>
          ))}
        </div>
        <p className="text-sm leading-relaxed">{children}</p>
      </BubbleContent>
    </Bubble>
  )
}