import { useEffect, useState } from "react"

import {
  Bubble,
  BubbleContent,
  BubbleReactions,
} from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatClock } from "./data"
import { PlayIcon, PauseIcon, CopyIcon, PencilIcon, RefreshCwIcon } from "lucide-react"

const ICON_PLAY = (
  <PlayIcon className="size-4" aria-hidden="true" />
)

const ICON_PAUSE = (
  <PauseIcon className="size-4" aria-hidden="true" />
)

const ICON_COPY = (
  <CopyIcon className="size-3.5" aria-hidden="true" />
)

const ICON_EDIT = (
  <PencilIcon className="size-3.5" aria-hidden="true" />
)

const ICON_RESEND = (
  <RefreshCwIcon className="size-3.5" aria-hidden="true" />
)

/** One transport tick. A whole second keeps the clock honest and holds the
    re-render count to one per second while a note plays. */
const TICK_MS = 1000

/** A spoken turn: a scrubbable transport over the text it transcribed to.
    Drive `position` from a real audio element and the rest is unchanged. */
export function VoiceNote({
  seconds,
  transcript,
  transcribing,
  onCopy,
  onEdit,
  onResend,
}: {
  seconds: number
  transcript: string
  /** True until the transcript lands, so the text reserves its own space. */
  transcribing: boolean
  onCopy: () => void
  onEdit: () => void
  onResend: () => void
}) {
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setPosition((current) => {
        // Stopping inside the tick keeps the clock and the button in step
        // without a second effect watching the position.
        if (current + 1 >= seconds) {
          setPlaying(false)
          return seconds
        }
        return current + 1
      })
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [playing, seconds])

  function toggle() {
    // A finished note replays from the top rather than sitting on its end.
    if (!playing && position >= seconds) setPosition(0)
    setPlaying(!playing)
  }

  return (
    <Bubble variant="muted" align="end" className="w-full max-w-full">
      <BubbleContent className="flex w-full max-w-full flex-col gap-2.5 px-3 py-2.5">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon-sm"
            aria-label={playing ? "Pause voice note" : "Play voice note"}
            onClick={toggle}
            className="rounded-full"
          >
            {playing ? ICON_PAUSE : ICON_PLAY}
          </Button>

          {/* The slot is always here so the clock never shifts; the track
              itself only appears once there is progress to show. */}
          <div className="min-w-0 flex-1">
            {position > 0 ? (
              <Slider
                value={[position]}
                onValueChange={(next) =>
                  setPosition(Array.isArray(next) ? next[0] : next)
                }
                min={0}
                max={seconds}
                step={1}
                aria-label="Playback position"
              />
            ) : null}
          </div>

          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatClock(seconds - position)}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            Transcription
            {transcribing ? <Spinner className="size-3" /> : null}
          </span>
          {transcribing ? (
            <div className="flex flex-col gap-1.5 py-0.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ) : (
            <p className="text-sm leading-relaxed">{transcript}</p>
          )}
        </div>
      </BubbleContent>

      {/* Hidden until the turn is pointed at, and always out on touch, where
          there is no hover to reveal it with. */}
      {transcribing ? null : (
        <BubbleReactions
          side="bottom"
          align="end"
          className="opacity-0 group-hover/bubble:opacity-100 focus-within:opacity-100 max-md:opacity-100"
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Copy transcript"
                  onClick={onCopy}
                  className="rounded-full"
                />
              }
            >
              {ICON_COPY}
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Edit transcript"
                  onClick={onEdit}
                  className="rounded-full"
                />
              }
            >
              {ICON_EDIT}
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Send again"
                  onClick={onResend}
                  className="rounded-full"
                />
              }
            >
              {ICON_RESEND}
            </TooltipTrigger>
            <TooltipContent>Resend</TooltipContent>
          </Tooltip>
        </BubbleReactions>
      )}
    </Bubble>
  )
}