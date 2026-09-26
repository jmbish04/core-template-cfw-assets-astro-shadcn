import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

import { ASSISTANT_NAME, ORG_NAME } from "./data"

/** Line widths per paragraph, ragged the way prose is. No copy, only shape. */
const PARAGRAPHS = [
  ["w-full", "w-full", "w-11/12", "w-2/3"],
  ["w-full", "w-10/12", "w-full", "w-1/2"],
  ["w-11/12", "w-full", "w-3/4"],
  ["w-full", "w-full", "w-9/12", "w-5/12"],
]

/** Widths for the lines inside the code sample block. */
const CODE_LINES = ["w-2/5", "w-3/5", "w-1/2", "w-4/6", "w-1/3"]

// customize: swap this whole body for your own page. The panel beside it does
// not read anything from here, so nothing else changes.
function ArticleSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      {PARAGRAPHS.slice(0, 2).map((lines, index) => (
        <div key={index} className="flex flex-col gap-2.5">
          {lines.map((width, line) => (
            <Skeleton key={line} className={`h-3.5 ${width}`} />
          ))}
        </div>
      ))}

      <div className="flex flex-col gap-2.5 border-s ps-4">
        {CODE_LINES.map((width, index) => (
          <Skeleton key={index} className={`h-3 ${width}`} />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-56" />
        {PARAGRAPHS[2].map((width, index) => (
          <Skeleton key={index} className={`h-3.5 ${width}`} />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-44" />
        {PARAGRAPHS[3].map((width, index) => (
          <Skeleton key={index} className={`h-3.5 ${width}`} />
        ))}
      </div>

      <Skeleton className="h-28" />

      {PARAGRAPHS.map((lines, index) => (
        <div key={index} className="flex flex-col gap-2.5">
          {lines.map((width, line) => (
            <Skeleton key={line} className={`h-3.5 ${width}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** The documentation the panel answers from. Only the header is live: it owns
    the one control that reveals and hides the assistant. */
export function DocsPage() {
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
          Docs
        </span>

        <Button
          variant={shown ? "secondary" : "default"}
          size="sm"
          aria-pressed={shown}
          onClick={toggleSidebar}
          className="ms-auto shrink-0"
        >
          {ASSISTANT_NAME}
        </Button>
      </header>

      <ArticleSkeleton />
    </div>
  )
}