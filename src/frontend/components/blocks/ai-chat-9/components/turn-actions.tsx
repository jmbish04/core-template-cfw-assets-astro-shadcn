import { useEffect, useRef, useState, type ReactNode, type Ref } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CopyIcon, CheckIcon, RefreshCwIcon, PencilIcon, ThumbsUpIcon, ThumbsDownIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_COPY = (
  <CopyIcon aria-hidden="true" />
)

const ICON_CHECK = (
  <CheckIcon aria-hidden="true" />
)

const ICON_REGENERATE = (
  <RefreshCwIcon aria-hidden="true" />
)

const ICON_EDIT = (
  <PencilIcon aria-hidden="true" />
)

const ICON_LIKE = (
  <ThumbsUpIcon aria-hidden="true" />
)

const ICON_DISLIKE = (
  <ThumbsDownIcon aria-hidden="true" />
)

/**
 * Per turn actions. `always` keeps the newest reply's bar on screen at rest;
 * older turns reveal on hover or focus, and below md there is no hover at all.
 */
export function ActionReveal({
  always = false,
  className,
  children,
}: {
  always?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 transition-opacity",
        always
          ? "opacity-100"
          : "pointer-events-none opacity-0 group-hover/turn:pointer-events-auto group-hover/turn:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-100",
        className
      )}
    >
      {children}
    </span>
  )
}

export function TurnAction({
  label,
  icon,
  pressed,
  ref,
  onClick,
}: {
  label: string
  icon: ReactNode
  /** So a control that opens an overlay can take focus back on close. */
  ref?: Ref<HTMLButtonElement>
  /** Set only on real toggles; Copy, Edit and Regenerate are plain buttons.
      A toggle keeps one name: aria-pressed already carries the state. */
  pressed?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          // A filled variant, not a tint: the primary token reads as the
          // foreground here, so colour alone would not show the state.
          <Button
            ref={ref}
            variant={pressed ? "secondary" : "ghost"}
            size="icon-xs"
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function CopyAction({
  label,
  text,
  toastLabel,
}: {
  label: string
  text: string
  /** What the toast says landed on the clipboard. */
  toastLabel: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  return (
    <TurnAction
      label={copied ? "Copied" : label}
      icon={copied ? ICON_CHECK : ICON_COPY}
      onClick={() => {
        // Clipboard access is denied on an unfocused document, so the
        // confirmation waits for the write instead of claiming it.
        navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true)
            toast(toastLabel)
            if (timer.current) window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => setCopied(false), 1400)
          })
          .catch(() => {
            setCopied(false)
            toast.error("Copy failed")
          })
      }}
    />
  )
}

export type Vote = "up" | "down"

/** Rating on a reply. The value is held by the conversation and keyed by turn,
    so it survives a version switch, a thread switch and a fold. */
export function VoteActions({
  vote,
  onVote,
}: {
  vote: Vote | null
  /** null clears the rating, which is what pressing the set one again does. */
  onVote: (next: Vote | null) => void
}) {
  function cast(next: Vote) {
    const clearing = vote === next
    onVote(clearing ? null : next)
    toast(
      clearing
        ? "Feedback removed"
        : next === "up"
          ? "Thanks, noted as a good reply"
          : "Thanks, noted as a bad reply"
    )
  }

  return (
    <>
      <TurnAction
        label="Good reply"
        icon={ICON_LIKE}
        pressed={vote === "up"}
        onClick={() => cast("up")}
      />
      <TurnAction
        label="Bad reply"
        icon={ICON_DISLIKE}
        pressed={vote === "down"}
        onClick={() => cast("down")}
      />
    </>
  )
}

export function EditAction({
  ref,
  onEdit,
}: {
  ref?: Ref<HTMLButtonElement>
  onEdit: () => void
}) {
  return (
    <TurnAction
      ref={ref}
      label="Edit message"
      icon={ICON_EDIT}
      onClick={onEdit}
    />
  )
}

/** Writes a new version of this reply with the model the composer is set to. */
export function RegenerateAction({
  modelLabel,
  onRegenerate,
}: {
  modelLabel: string
  onRegenerate: () => void
}) {
  return (
    <TurnAction
      label={`Regenerate with ${modelLabel}`}
      icon={ICON_REGENERATE}
      onClick={onRegenerate}
    />
  )
}