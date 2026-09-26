import { cn } from "@/lib/utils"

import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@/components/ui/marker"
import { Spinner } from "@/components/ui/spinner"
import { SOURCES, type ActivityStep } from "./data"
import { CheckIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_DONE = (
  <CheckIcon className="size-3.5" aria-hidden="true" />
)

export function ActivitySteps({
  steps,
  /** How many steps have finished. The one at this index is in flight. */
  index,
  className,
}: {
  steps: ActivityStep[]
  index: number
  className?: string
}) {
  const shown = steps.slice(0, Math.min(index + 1, steps.length))

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {shown.map((step, at) => {
        const done = at < index
        const source = step.source ? SOURCES[step.source] : undefined
        return (
          <Marker
            key={step.label}
            className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
          >
            <MarkerIcon>{done ? ICON_DONE : <Spinner />}</MarkerIcon>
            <MarkerContent
              className={cn(
                "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px]",
                done ? "text-muted-foreground" : "text-foreground"
              )}
            >
              <span className="min-w-0">{step.label}</span>
              {source ? (
                // Named the way the switcher names an artifact, so the same
                // document reads the same everywhere in the block.
                <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">
                  {source.title}
                </span>
              ) : null}
            </MarkerContent>
          </Marker>
        )
      })}
    </div>
  )
}