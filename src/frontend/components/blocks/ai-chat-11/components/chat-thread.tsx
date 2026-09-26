import { Frame, FramePanel } from "@/components/reui/frame"
import { cn } from "@/lib/utils"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Marker, MarkerContent } from "@/components/ui/marker"
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { AnswerSlab, GLASS } from "./answer-slab"
import { STARTERS, type Density, type TurnRecord } from "./data"
import { SparklesIcon, ArrowRightIcon } from "lucide-react"

/** The thinking line breathes rather than shimmers: opacity holds at any width. */
const MOTION = `
@keyframes chat11-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.chat11-pulse {
  animation: chat11-pulse 1.9s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .chat11-pulse {
    animation: none;
  }
}
`

function ThreadEmpty({ onStarter }: { onStarter: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-16">
      <Empty className="flex-none p-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SparklesIcon className="size-5" aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>New Thread</EmptyTitle>
          <EmptyDescription>
            Ask about a run, a file, or a queue.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <div className="flex flex-wrap justify-center gap-2">
        {STARTERS.map((starter) => (
          <Bubble key={starter} variant="outline">
            <BubbleContent
              render={
                <button type="button" onClick={() => onStarter(starter)} />
              }
              className="px-3 py-1.5 text-xs"
            >
              {starter}
            </BubbleContent>
          </Bubble>
        ))}
      </div>
    </div>
  )
}

/**
 * The transcript. Asks stay bubbles and replies become receipts, so the eye
 * can separate what was wanted from what the run actually produced.
 */
export function ChatThread({
  turns,
  streaming,
  thinking,
  dateLabel,
  density,
  showRunDetails,
  showTimestamps,
  ratings,
  quickReplies,
  onRate,
  onRetry,
  onQuickReply,
  onStarter,
}: {
  turns: TurnRecord[]
  streaming: boolean
  thinking: string
  /** Heads the transcript, supplied by the open thread. */
  dateLabel: string
  density: Density
  /** Header settings; both gate chrome, never the answer itself. */
  showRunDetails: boolean
  showTimestamps: boolean
  ratings: Record<string, "up" | "down">
  /** Follow ups for the newest settled reply only, so no chip goes stale. */
  quickReplies: string[]
  onRate: (turnId: string, next: "up" | "down") => void
  onRetry: (turnId: string) => void
  onQuickReply: (text: string) => void
  onStarter: (text: string) => void
}) {
  return (
    // Bottom following, with no anchored item anywhere in the transcript: the
    // peek prop only reads on a scrollAnchor element, so it would be inert here.
    <MessageScrollerProvider autoScroll>
      <style>{MOTION}</style>

      <MessageScroller className="relative z-10 min-h-0 flex-1">
        <MessageScrollerViewport className="scrollbar">
          <MessageScrollerContent
            aria-busy={streaming}
            // justify-end pins a short thread to the composer; the h-max box
            // leaves no free space once it overflows, so the top stays reachable.
            className={cn(
              "mx-auto flex w-full max-w-3xl min-w-0 flex-col justify-end px-4 py-6 sm:px-6",
              density === "compact" ? "gap-3" : "gap-6"
            )}
          >
            {turns.length === 0 ? (
              <ThreadEmpty onStarter={onStarter} />
            ) : (
              <>
                <MessageScrollerItem
                  scrollAnchor={false}
                  className="[content-visibility:visible]"
                >
                  <Marker variant="separator">
                    <MarkerContent className="text-xs">
                      {dateLabel}
                    </MarkerContent>
                  </Marker>
                </MessageScrollerItem>

                {turns.map((turn) => (
                  <MessageScrollerItem
                    key={turn.id}
                    scrollAnchor={false}
                    // The scroller's own content-visibility reports a short
                    // placeholder for a tall turn, and scrollToEnd lands short.
                    className="[content-visibility:visible]"
                  >
                    {turn.role === "user" ? (
                      <Message align="end">
                        <MessageContent className="min-w-0">
                          <Bubble variant="muted" align="end">
                            {/* The dot field runs under the thread, so the ask
                                needs its own edge to sit on. */}
                            <BubbleContent
                              className={cn(GLASS, "border-border")}
                            >
                              {turn.text}
                            </BubbleContent>
                          </Bubble>
                          {showTimestamps ? (
                            <MessageFooter className="text-muted-foreground pt-1 text-xs tabular-nums">
                              {turn.at}
                            </MessageFooter>
                          ) : null}
                        </MessageContent>
                      </Message>
                    ) : (
                      <AnswerSlab
                        turn={turn}
                        thinking={thinking}
                        showRunDetails={showRunDetails}
                        rating={ratings[turn.id] ?? null}
                        onRate={onRate}
                        onRetry={onRetry}
                      />
                    )}
                  </MessageScrollerItem>
                ))}

                {/* Follow ups hang off the newest reply, never off the thread. */}
                {quickReplies.length > 0 ? (
                  <MessageScrollerItem
                    scrollAnchor={false}
                    className="[content-visibility:visible]"
                  >
                    <div className="flex flex-wrap gap-2">
                      {quickReplies.map((reply) => (
                        <Bubble key={reply} variant="outline">
                          <BubbleContent
                            render={
                              <button
                                type="button"
                                onClick={() => onQuickReply(reply)}
                              />
                            }
                            className="flex flex-row items-center gap-1.5 px-3 py-1.5 text-xs"
                          >
                            {reply}
                            <ArrowRightIcon className="size-3 opacity-60" aria-hidden="true" />
                          </BubbleContent>
                        </Bubble>
                      ))}
                    </div>
                  </MessageScrollerItem>
                ) : null}
              </>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        {/* aria-busy silences the log, so the in-flight step is announced from
            outside it rather than not at all. */}
        <p role="status" aria-live="polite" className="sr-only">
          {streaming ? thinking : ""}
        </p>

        {/* Pill jump to latest, shown only while the reader is scrolled up. */}
        <MessageScrollerButton
          variant="outline"
          size="icon-sm"
          className="bottom-4 rounded-full shadow-sm"
        />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}