import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { ORG_NAME, VIEWER } from "./data"
import { BotIcon } from "lucide-react"

/** Bar heights for the placeholder chart. Uneven on purpose: a flat set reads
    as a loading state rather than a page. */
const BARS = [
  "h-16",
  "h-24",
  "h-12",
  "h-28",
  "h-20",
  "h-32",
  "h-14",
  "h-26",
  "h-18",
  "h-36",
  "h-22",
  "h-16",
]

/** Row shapes for the placeholder table: cell widths only, no copy. Long
    enough that the page scrolls under its sticky header. */
const ROWS = [
  ["w-44", "w-20"],
  ["w-32", "w-28"],
  ["w-56", "w-16"],
  ["w-40", "w-24"],
  ["w-28", "w-20"],
  ["w-52", "w-28"],
  ["w-36", "w-16"],
  ["w-48", "w-24"],
  ["w-36", "w-20"],
  ["w-44", "w-28"],
  ["w-56", "w-16"],
  ["w-34", "w-24"],
]

// customize: swap this whole body for your own page. Every block is
// animate-none: a backdrop that pulses forever reads as one still loading.
function BodySkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex w-full flex-col gap-8 px-4 py-6 sm:px-6"
    >
      <div className="flex items-center justify-between gap-4">
        {/* min-w-0 lets the title blocks yield, so the action block beside them
            keeps its size instead of running past a narrow page. */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-52 max-w-full animate-none" />
          <Skeleton className="h-3.5 w-72 max-w-full animate-none" />
        </div>
        <Skeleton className="h-8 w-28 shrink-0 animate-none" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          {BARS.map((height, index) => (
            <Skeleton key={index} className={`w-full animate-none ${height}`} />
          ))}
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-3 w-20 animate-none" />
          <Skeleton className="h-3 w-16 animate-none" />
          <Skeleton className="h-3 w-24 animate-none" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-32 animate-none" />
        {ROWS.map((cells, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="size-8 shrink-0 animate-none rounded-full" />
            {cells.map((width, cell) => (
              <Skeleton key={cell} className={`h-3.5 animate-none ${width}`} />
            ))}
            <Skeleton className="ms-auto h-6 w-16 shrink-0 animate-none" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** The page the panel floats over. Only the header is live: it owns the one
    control that reveals and hides the assistant. */
export function PageBody() {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar()
  const shown = isMobile ? openMobile : open

  return (
    // The header sits inside the scroller, so the page truly travels under it:
    // the blur has content to blur and the gradient softens where it passes out.
    <div className="scrollbar min-h-0 flex-1 overflow-y-auto">
      <header className="bg-background/70 supports-backdrop-filter:bg-background/60 after:from-background sticky top-0 z-10 flex h-14 items-center gap-2 px-4 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-6 after:bg-gradient-to-b after:to-transparent sm:px-6">
        <span className="min-w-0 truncate text-sm font-medium">{ORG_NAME}</span>
        <span
          aria-hidden="true"
          className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
        />
        <span className="text-muted-foreground min-w-0 truncate text-sm">
          Signups
        </span>

        <div className="ms-auto flex shrink-0 items-center gap-3">
          <Button
            variant={shown ? "secondary" : "default"}
            size="sm"
            aria-pressed={shown}
            onClick={toggleSidebar}
            className="gap-1.5"
          >
            <BotIcon className="size-4" aria-hidden="true" />
            AI Assistant
          </Button>
          <Avatar className="size-7">
            <AvatarImage src={VIEWER.avatar} alt={VIEWER.name} />
            <AvatarFallback className="text-xs">
              {VIEWER.initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <BodySkeleton />
    </div>
  )
}