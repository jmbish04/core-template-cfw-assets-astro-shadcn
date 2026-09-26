import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { articlesByIds, type ArticleRecord } from "./data"
import { CheckIcon, MinusIcon, BookOpenIcon, ChevronDownIcon } from "lucide-react"

/** Where a reply is between the question and the words. */
export type RetrievalPhase = "searching" | "reading" | "writing"

const ICON_READ = (
  <CheckIcon className="size-3.5" aria-hidden="true" />
)

const ICON_SKIPPED = (
  <MinusIcon className="size-3.5" aria-hidden="true" />
)

const ICON_LIBRARY = (
  <BookOpenIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_EXPAND = (
  <ChevronDownIcon className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-data-[panel-open]/receipt:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
)

/** What each article did for the answer. `reading` is the live cursor. */
type ArticleState = "queued" | "reading" | "read" | "used" | "skipped"

const STATE_LABEL: Record<ArticleState, string> = {
  queued: "Queued",
  reading: "Reading",
  read: "Read",
  used: "Used",
  skipped: "Skipped",
}

/** One line per article: state, title, and the shelf it came off. Dimmed
    while it is still queued or once it was set aside. */
function ArticleRow({
  article,
  state,
}: {
  article: ArticleRecord
  state: ArticleState
}) {
  const quiet = state === "queued" || state === "skipped"

  return (
    <Item
      size="xs"
      render={<a href="#" />}
      aria-label={`${STATE_LABEL[state]}. ${article.title}, ${article.section}`}
      data-quiet={quiet || undefined}
      className="gap-2 px-1.5 py-1 data-quiet:opacity-55"
    >
      <ItemMedia className="text-muted-foreground w-4">
        {state === "reading" ? <Spinner className="size-3.5" /> : null}
        {state === "read" || state === "used" ? (
          <span className="text-success">{ICON_READ}</span>
        ) : null}
        {state === "skipped" ? ICON_SKIPPED : null}
        {state === "queued" ? (
          <span
            aria-hidden="true"
            className="bg-muted-foreground/40 size-1.5 rounded-full"
          />
        ) : null}
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0">
        <ItemTitle className="min-w-0 truncate text-xs font-normal">
          {article.title}
        </ItemTitle>
      </ItemContent>
      <span className="text-muted-foreground shrink-0 text-xs">
        {article.section}
      </span>
    </Item>
  )
}

/**
 * The retrieval in flight. The header names the stage, the list ticks through
 * the matches, and the count is the one number that moves.
 */
export function RetrievalLive({
  phase,
  matched,
  readCount,
}: {
  phase: RetrievalPhase
  matched: string[]
  /** How many of the matches have been read so far. */
  readCount: number
}) {
  const articles = articlesByIds(matched)
  const searching = phase === "searching"

  return (
    <div className="flex flex-col gap-1" aria-live="polite">
      <div className="text-muted-foreground flex items-center gap-2 px-1.5 text-sm">
        <Spinner className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">
          {searching ? "Searching the docs" : null}
          {phase === "reading" ? `Reading ${articles.length} articles` : null}
          {phase === "writing" ? "Writing the answer" : null}
        </span>
        {searching ? null : (
          <span className="ms-auto shrink-0 text-xs tabular-nums">
            {Math.min(readCount, articles.length)}/{articles.length}
          </span>
        )}
      </div>

      {/* The list only exists once the search has something to show. */}
      {searching ? null : (
        <div className="flex flex-col">
          {articles.map((article, index) => (
            <ArticleRow
              key={article.id}
              article={article}
              state={
                index < readCount
                  ? "read"
                  : index === readCount
                    ? "reading"
                    : "queued"
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * What the retrieval left behind, folded away. The summary is the claim, the
 * list is the evidence, and the reader decides whether to check it.
 */
export function RetrievalReceipt({
  matched,
  usedIds,
}: {
  matched: string[]
  usedIds: string[]
}) {
  const articles = articlesByIds(matched)
  if (!articles.length) return null
  const used = articles.filter((article) => usedIds.includes(article.id))

  return (
    <Collapsible>
      <CollapsibleTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            // The dot between the counts leaves no gap in the computed name.
            aria-label={`Read ${articles.length} articles, used ${used.length}`}
            className="group/receipt text-muted-foreground hover:text-foreground h-7 w-fit max-w-full justify-start gap-2 px-1.5 font-normal"
          />
        }
      >
        {ICON_LIBRARY}
        <span className="min-w-0 truncate text-xs">
          Read {articles.length} articles
        </span>
        <span
          aria-hidden="true"
          className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
        />
        <span className="shrink-0 text-xs tabular-nums">
          Used {used.length}
        </span>
        <span className="flex shrink-0">{ICON_EXPAND}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col pt-1">
          {articles.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              state={usedIds.includes(article.id) ? "used" : "skipped"}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}