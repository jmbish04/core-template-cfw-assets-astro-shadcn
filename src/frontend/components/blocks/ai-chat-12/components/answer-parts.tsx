import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type StepRecord } from "./data"
import { CornerDownRightIcon, ThumbsUpIcon, ThumbsDownIcon, LifeBuoyIcon } from "lucide-react"

/** Up, down, or not asked yet. */
export type Vote = "up" | "down" | null

const ICON_FOLLOW = (
  <CornerDownRightIcon className="mt-px size-3.5 shrink-0 opacity-50" aria-hidden="true" />
)

const ICON_UP = (
  <ThumbsUpIcon className="size-3.5" aria-hidden="true" />
)

const ICON_DOWN = (
  <ThumbsDownIcon className="size-3.5" aria-hidden="true" />
)

const ICON_SUPPORT = (
  <LifeBuoyIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const MUTED_ICON_BUTTON = "text-muted-foreground hover:text-foreground"

/** The assistant's prose, its ordered steps, and the caveat underneath. The
    lead arrives first; the rest lands once it has finished typing. */
export function AnswerBubble({
  lead,
  steps,
  note,
  settled,
}: {
  lead: string
  steps?: StepRecord[]
  note?: string
  /** False while the lead is still revealing, so nothing lands early. */
  settled: boolean
}) {
  return (
    <Bubble variant="outline" className="max-w-full">
      <BubbleContent className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed">{lead}</p>

        {settled && steps?.length ? (
          <ol className="flex flex-col gap-2">
            {steps.map((step, index) => (
              <li
                key={step.text}
                className="flex gap-2.5 text-sm leading-relaxed"
              >
                {/* The list already carries the order for a screen reader. */}
                <span
                  aria-hidden="true"
                  className="text-muted-foreground w-3 shrink-0 tabular-nums"
                >
                  {index + 1}
                </span>
                <span className="min-w-0">{step.text}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {settled && note ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {note}
          </p>
        ) : null}
      </BubbleContent>
    </Bubble>
  )
}

/** What the assistant says when the knowledge base does not hold the answer. */
export function HandoffBubble({
  lead,
  detail,
  settled,
}: {
  lead: string
  detail: string
  settled: boolean
}) {
  return (
    <Bubble variant="outline" className="max-w-full">
      <BubbleContent className="flex flex-col gap-2">
        <p className="text-sm leading-relaxed">{lead}</p>
        {settled ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {detail}
          </p>
        ) : null}
      </BubbleContent>
    </Bubble>
  )
}

/** The way out of the knowledge base, offered wherever it failed the reader. */
export function ContactSupport({ onContact }: { onContact: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onContact}
      className="w-fit gap-1.5"
    >
      {ICON_SUPPORT}
      Contact Support
    </Button>
  )
}

/**
 * Was the answer any good. A thumbs down is not a dead end: it opens the
 * handover to a person, which is the only thing left to offer.
 */
export function AnswerFeedback({
  vote,
  onVote,
  contacted,
  onContact,
}: {
  vote: Vote
  onVote: (vote: Vote) => void
  /** True once this answer has already been handed to support. */
  contacted: boolean
  onContact: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="This answer helped"
                aria-pressed={vote === "up"}
                onClick={() => onVote(vote === "up" ? null : "up")}
                className={`${MUTED_ICON_BUTTON} aria-pressed:text-success`}
              />
            }
          >
            {ICON_UP}
          </TooltipTrigger>
          <TooltipContent>Helpful</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="This answer missed"
                aria-pressed={vote === "down"}
                onClick={() => onVote(vote === "down" ? null : "down")}
                className={`${MUTED_ICON_BUTTON} aria-pressed:text-foreground`}
              />
            }
          >
            {ICON_DOWN}
          </TooltipTrigger>
          <TooltipContent>Not helpful</TooltipContent>
        </Tooltip>

        {vote === "up" ? (
          <span role="status" className="text-muted-foreground ps-1.5 text-xs">
            Glad that helped.
          </span>
        ) : null}
        {vote === "down" && contacted ? (
          <span role="status" className="text-muted-foreground ps-1.5 text-xs">
            Support has this one.
          </span>
        ) : null}
      </div>

      {vote === "down" && !contacted ? (
        <ContactSupport onContact={onContact} />
      ) : null}
    </div>
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
          className="text-muted-foreground hover:text-foreground h-auto w-fit max-w-full items-start justify-start gap-2 px-2 py-1 text-xs font-normal whitespace-normal"
        >
          {ICON_FOLLOW}
          <span className="min-w-0 text-start">{prompt}</span>
        </Button>
      ))}
    </div>
  )
}