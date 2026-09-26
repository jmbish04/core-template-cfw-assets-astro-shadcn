import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { ORG_NAME, VIEWER } from "./data"
import { SparklesIcon } from "lucide-react"

const ICON_ASSISTANT = (
  <SparklesIcon className="size-4" aria-hidden="true" />
)

/** Row shapes for the placeholder table: cell widths only, no copy. Long
    enough that the page scrolls under its sticky header. */
const ROWS = [
  ["w-40", "w-24", "w-16"],
  ["w-56", "w-20", "w-12"],
  ["w-32", "w-28", "w-16"],
  ["w-48", "w-16", "w-10"],
  ["w-44", "w-24", "w-14"],
  ["w-36", "w-20", "w-12"],
  ["w-52", "w-28", "w-10"],
  ["w-28", "w-16", "w-16"],
  ["w-44", "w-20", "w-14"],
  ["w-60", "w-24", "w-12"],
  ["w-36", "w-28", "w-16"],
  ["w-48", "w-20", "w-10"],
  ["w-40", "w-16", "w-14"],
  ["w-56", "w-24", "w-12"],
  ["w-32", "w-20", "w-16"],
  ["w-44", "w-28", "w-10"],
]

// customize: swap this whole body for your own page. The panel beside it does
// not read anything from here, so nothing else changes.
function BodySkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex w-full flex-col gap-8 px-4 py-6 sm:px-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-8 w-24 shrink-0" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        {ROWS.map((cells, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            {cells.map((width, cell) => (
              <Skeleton key={cell} className={`h-3.5 ${width}`} />
            ))}
            <Skeleton className="ms-auto h-6 w-14 shrink-0" />
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
          Calendar
        </span>

        <div className="ms-auto flex shrink-0 items-center gap-3">
          <Button
            variant={shown ? "secondary" : "default"}
            size="sm"
            aria-pressed={shown}
            onClick={toggleSidebar}
            className="gap-1.5"
          >
            {ICON_ASSISTANT}
            Assistant
          </Button>
          <Avatar className="size-7">
            <AvatarImage src={VIEWER.avatar} alt={VIEWER.name} />
            <AvatarFallback className="text-[10px]">
              {VIEWER.initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <BodySkeleton />
    </div>
  )
}