import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

import { CONTEXT_SOURCES, GREETING, STARTERS, type ThreadRecord } from "./data"

/** The house separator between rendered segments, never a typed character. */
/**
 * The primary offer: an icon tile carries it, and the source it will attach
 * rides as a chip so the click is a visible contract about what gets read.
 */
/** The source a starter attaches, so the row previews the chip it produces. */
function sourceIcon(contextId: string) {
  return CONTEXT_SOURCES.find((source) => source.id === contextId)?.icon ?? null
}

function StartRow({
  icon,
  title,
  onClick,
}: {
  icon: ReactNode
  title: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      // The row is the affordance, so it grows with its two lines instead of
      // holding a control height.
      className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-start font-normal"
    >
      {/* Bare: the outlined row already paints the surface a tile would. */}
      <span className="text-muted-foreground shrink-0 [&>svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 truncate text-sm">{title}</span>
    </Button>
  )
}

/**
 * Same row geometry as a starter, one weight down: ghost has no border at rest
 * and fills on hover, so returning work reads as secondary, not separate.
 */
/** One recent thread as a link, stacked one per line. */
function ResumeLink({
  icon,
  title,
  aside,
  onClick,
}: {
  icon: ReactNode
  title: string
  aside: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/resume flex w-full min-w-0 cursor-pointer items-center gap-2 py-1 text-start"
    >
      {/* Bare, and it warms with the title so the row reads as one link. */}
      <span
        aria-hidden="true"
        className="text-muted-foreground group-hover/resume:text-foreground shrink-0 transition-colors [&>svg]:size-3.5"
      >
        {icon}
      </span>
      <span className="text-muted-foreground group-hover/resume:text-foreground min-w-0 truncate text-sm underline-offset-4 transition-colors group-hover/resume:underline">
        {title}
      </span>
      <span className="text-muted-foreground/70 shrink-0 text-xs tabular-nums">
        {aside}
      </span>
    </button>
  )
}

export function Welcome({
  threads,
  onUseStarter,
  onOpenThread,
}: {
  threads: ThreadRecord[]
  /** Fills the composer and attaches the named context: never auto sends. */
  onUseStarter: (prompt: string, contextId: string) => void
  onOpenThread: (id: string) => void
}) {
  return (
    // Centred while it fits, scrollable once the stack outgrows a short
    // viewport. `m-auto` centres without clipping the way justify-center does.
    <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6">
      <div className="m-auto flex w-full max-w-3xl flex-col gap-8">
        <Empty className="flex-none gap-0 p-0">
          {/* No media: the greeting is the focal point, and one grounding fact
              under it beats a row of stats the list already implies. */}
          <EmptyHeader className="max-w-none items-center gap-2">
            <EmptyTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
              <h1>{GREETING.title}</h1>
            </EmptyTitle>
            <EmptyDescription className="text-sm">
              {GREETING.stats[0]}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        {/* A narrower rail than the greeting: these rows are short, so the full
            column would open a gap between a title and its figure. */}
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
          <section className="flex flex-col gap-1">
            {/* Padding matches the rows' own, keeping the heading on the spine. */}
            <h2 className="text-muted-foreground text-xs font-medium">Start</h2>
            <ul className="flex flex-col gap-2">
              {STARTERS.map((starter) => (
                <li key={starter.id}>
                  <StartRow
                    icon={sourceIcon(starter.contextId)}
                    title={starter.prompt}
                    onClick={() =>
                      onUseStarter(starter.prompt, starter.contextId)
                    }
                  />
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-1">
            <h2 className="text-muted-foreground text-xs font-medium">
              Resume
            </h2>
            {/* A plain stack of links: history is reachable without adding a
                second block of surfaces beside the starters. */}
            <ul className="flex flex-col">
              {threads.map((thread) => (
                <li key={thread.id} className="min-w-0">
                  <ResumeLink
                    icon={thread.icon}
                    title={thread.title}
                    aside={thread.at}
                    onClick={() => onOpenThread(thread.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}