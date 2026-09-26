import { Badge } from "@/components/reui/badge"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  eventTitle,
  formatTime,
  type EventRecord,
  type MoveRecord,
  type PersonRecord,
} from "./data"
import { CalendarIcon, CheckIcon, XIcon } from "lucide-react"

const ICON_EVENT = (
  <CalendarIcon className="text-primary size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_APPLIED = (
  <CheckIcon className="text-success size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_YES = (
  <CheckIcon className="size-4" aria-hidden="true" />
)

const ICON_NO = (
  <XIcon className="size-4" aria-hidden="true" />
)

const ICON_YES_SM = (
  <CheckIcon className="size-3" aria-hidden="true" />
)

const ICON_NO_SM = (
  <XIcon className="size-3" aria-hidden="true" />
)

export type PlanDecision = "pending" | "approved" | "declined"

/** One line of the proposal: what changes, and where it lands. */
type PlanLine = { id: string; title: string; verb: string; landing: string }

/** Faces before the overflow chip takes over. */
const FACE_LIMIT = 3

/** The entries a set of ids points at, in schedule order. */
function turnEvents(schedule: EventRecord[], ids: string[]) {
  return schedule.filter((event) => ids.includes(event.id))
}

function landingLabel(startsAt: number, day?: string) {
  const time = formatTime(startsAt)
  return day ? `${day}, ${time}` : time
}

/**
 * The assistant's proposal and the one decision it needs. Approve is the only
 * thing that writes to the calendar, so nothing moves until it is pressed.
 */
export function PlanTurn({
  lead,
  moves,
  addId,
  question,
  schedule,
  pendingEvent,
  decision,
  onAttachEvent,
  onApprove,
  onDecline,
}: {
  lead: string
  moves: MoveRecord[]
  /** The entry booked alongside the moves, or "" when the plan only moves. */
  addId: string
  question: string
  /** Resolves each move's title, so a name lives in one place only. */
  schedule: EventRecord[]
  pendingEvent: EventRecord | null
  decision: PlanDecision
  onAttachEvent: (id: string) => void
  onApprove: () => void
  onDecline: () => void
}) {
  const applied = decision === "approved"

  /** Everyone the plan touches, deduped, so the panel can say who hears about
      it without the data listing the same person twice. */
  const guests: PersonRecord[] = []
  const seen = new Set<string>()
  const touched = [
    ...turnEvents(
      schedule,
      moves.map((move) => move.eventId)
    ),
    ...(pendingEvent && pendingEvent.id === addId ? [pendingEvent] : []),
  ]
  for (const event of touched)
    for (const person of event.guests)
      if (!seen.has(person.name)) {
        seen.add(person.name)
        guests.push(person)
      }
  const overflow = guests.length - FACE_LIMIT

  const lines: PlanLine[] = []
  if (addId && pendingEvent && pendingEvent.id === addId)
    lines.push({
      id: pendingEvent.id,
      title: pendingEvent.title,
      verb: applied ? "booked for" : "books at",
      landing: landingLabel(pendingEvent.startsAt),
    })
  for (const move of moves) {
    const title = eventTitle(schedule, move.eventId)
    if (!title) continue
    lines.push({
      id: move.eventId,
      title,
      verb: applied ? "moved to" : "moves to",
      landing: landingLabel(move.startsAt, move.day),
    })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Bubble variant="outline" className="max-w-full">
        <BubbleContent className="flex flex-col gap-2.5">
          <p className="text-sm leading-relaxed">{lead}</p>

          <ul className="flex flex-col gap-1.5">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center gap-2">
                {applied ? ICON_APPLIED : ICON_EVENT}
                <span className="min-w-0 text-sm leading-relaxed">
                  {/* Naming a meeting hands it to the composer, so the next
                      question is already scoped to the thing on screen. */}
                  <button
                    type="button"
                    aria-label={`Ask about ${line.title}`}
                    onClick={() => onAttachEvent(line.id)}
                    className="hover:text-primary font-medium underline underline-offset-2"
                  >
                    {line.title}
                  </button>{" "}
                  {line.verb} {line.landing}.
                </span>
              </li>
            ))}
          </ul>

          {guests.length ? (
            <div className="flex items-center gap-2">
              <AvatarGroup
                aria-label={`Guests affected: ${guests.map((person) => person.name).join(", ")}`}
                className="-space-x-1"
              >
                {guests.slice(0, FACE_LIMIT).map((person) => (
                  <Avatar key={person.name} className="size-5">
                    <AvatarImage src={person.avatar} alt={person.name} />
                    <AvatarFallback className="text-[9px]">
                      {person.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {overflow > 0 ? (
                  <AvatarGroupCount className="size-5 text-[9px] leading-none">
                    {/* A native button in both bases, so the count opens every
                        guest by tap or keyboard at phone widths too. */}
                    <Popover>
                      <PopoverTrigger
                        aria-label={`${overflow} more: ${guests
                          .slice(FACE_LIMIT)
                          .map((person) => person.name)
                          .join(", ")}`}
                        className="hover:text-foreground focus-visible:ring-ring/50 flex size-full items-center justify-center rounded-full tabular-nums outline-none focus-visible:ring-2"
                      >
                        +{overflow}
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto">
                        <div className="flex flex-col gap-2">
                          <span className="text-muted-foreground text-xs font-medium">
                            Guests
                          </span>
                          <ul className="flex flex-col gap-1.5">
                            {guests.map((person) => (
                              <li
                                key={person.name}
                                className="flex items-center gap-2"
                              >
                                <Avatar size="sm">
                                  <AvatarImage src={person.avatar} alt="" />
                                  <AvatarFallback>
                                    {person.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{person.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </AvatarGroupCount>
                ) : null}
              </AvatarGroup>
              <span className="text-muted-foreground text-xs">
                {applied ? "Notified" : "Will be notified"}
              </span>
            </div>
          ) : null}

          {decision === "pending" ? (
            <p className="text-sm leading-relaxed">{question}</p>
          ) : null}
        </BubbleContent>
      </Bubble>

      {decision === "pending" ? (
        <div className="flex flex-col gap-1.5">
          {/* Equal width, but only one of them is the primary action: this
              writes to a calendar other people are looking at. */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onDecline}
              className="gap-1.5"
            >
              {ICON_NO}
              Not Now
            </Button>
            <Button type="button" onClick={onApprove} className="gap-1.5">
              {ICON_YES}
              Approve
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Need another option? Just ask.
          </p>
        </div>
      ) : (
        <Badge
          variant={applied ? "success-light" : "outline"}
          className="gap-1"
        >
          {applied ? ICON_YES_SM : ICON_NO_SM}
          {applied ? "Approved" : "Not Now"}
        </Badge>
      )}
    </div>
  )
}