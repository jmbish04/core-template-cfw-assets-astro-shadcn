import { Fragment, memo, useEffect, useRef, useState } from "react"
import {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockExpandButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/reui/code-block/code-block"
import { cn } from "@/lib/utils"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { DOC_FILENAME, type MessagePart, type SourceRecord } from "./data"

/**
 * A comfortable measure for long form prose. The column itself stays wide so
 * the composer and the artifacts can use it; only the sentences are capped.
 */
const PROSE = "max-w-[60ch]"

/** `code`, **bold** and [1] citations, captured so split keeps the markers. */
const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*|\[\d+\])/g

/** How the reply body talks back to the sources listed under it. */
export type CiteHandlers = {
  sources: SourceRecord[]
  activeSourceId: string | null
  onCite: (id: string | null) => void
}

function CitationChip({
  index,
  source,
  active,
  onCite,
}: {
  index: number
  source: SourceRecord
  active: boolean
  onCite: (id: string | null) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            data-active={active}
            aria-label={`Citation ${index}, ${source.title}`}
            aria-pressed={active}
            onClick={() => onCite(active ? null : source.id)}
          />
        }
        className="bg-muted text-foreground/80 hover:text-foreground focus-visible:ring-ring/40 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground ms-px inline-flex h-4 min-w-4 -translate-y-1 items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums transition-colors outline-none focus-visible:ring-2"
      >
        {index}
      </TooltipTrigger>
      <TooltipContent>{source.title}</TooltipContent>
    </Tooltip>
  )
}

/** Splits one string into its inline runs. A citation with no source behind
    it stays literal text rather than a control that leads nowhere. */
function renderInline(source: string, cite?: CiteHandlers) {
  return source.split(INLINE_PATTERN).map((token, at) => {
    if (!token) return null
    if (token.startsWith("`") && token.endsWith("`"))
      return (
        <code
          key={at}
          className="bg-muted rounded-sm px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      )
    if (token.startsWith("**") && token.endsWith("**"))
      return (
        <strong key={at} className="text-foreground font-semibold">
          {token.slice(2, -2)}
        </strong>
      )
    const marker = /^\[(\d+)\]$/.exec(token)
    const cited = marker ? cite?.sources[Number(marker[1]) - 1] : undefined
    if (!marker || !cited || !cite) return <Fragment key={at}>{token}</Fragment>
    return (
      <CitationChip
        key={at}
        index={Number(marker[1])}
        source={cited}
        active={cite.activeSourceId === cited.id}
        onCite={cite.onCite}
      />
    )
  })
}

/** Sentence chunks with their trailing whitespace, so the arrival tint and
    the render walk the same segmentation. */
function splitSentences(text: string) {
  return text.match(/[^.?!]+[.?!]*\s*/g) ?? [text]
}

/** Wraps a run the previous version did not have, so a switched fork shows
    what changed rather than asking the reader to diff it by eye. */
function Tinted({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-primary/10 rounded-sm box-decoration-clone">
      {children}
    </span>
  )
}

function ProseText({
  text,
  known,
  cite,
  caret,
}: {
  text: string
  /** Runs the outgoing version already had. Null means no diff is running. */
  known: Set<string> | null
  cite?: CiteHandlers
  caret?: boolean
}) {
  return (
    <p className={cn(PROSE, "whitespace-pre-wrap")}>
      {splitSentences(text).map((chunk, index) => {
        if (known === null || known.has(chunk.trim()))
          return <Fragment key={index}>{renderInline(chunk, cite)}</Fragment>
        // Trailing whitespace stays outside the tint so a paragraph break
        // never carries a painted band across the empty line.
        const body = chunk.replace(/\s+$/, "")
        return (
          <Fragment key={index}>
            <Tinted>{renderInline(body, cite)}</Tinted>
            {chunk.slice(body.length)}
          </Fragment>
        )
      })}
      {caret ? <Caret /> : null}
    </p>
  )
}

/** Trails the last revealed word instead of blocking onto its own line. */
function Caret() {
  return (
    <span
      aria-hidden="true"
      className="bg-foreground ms-0.5 inline-block h-[1em] w-0.5 translate-y-0.5 animate-pulse motion-reduce:animate-none"
    />
  )
}

/** Lines a transcript artifact shows before it offers to expand. Twelve is
    the tallest block that still leaves the next turn on screen at 900px. */
const ARTIFACT_LINES = 14

function CodeArtifact({
  part,
  streaming = false,
}: {
  part: Extract<MessagePart, { kind: "code" }>
  streaming?: boolean
}) {
  return (
    // w-full fills the column, not the widest code line. The density variables
    // are the primitive's extension point; its defaults suit a docs page.
    <CodeBlock
      code={part.code}
      language={part.language}
      diff={part.diff}
      streaming={streaming}
      maxLines={ARTIFACT_LINES}
      className="w-full min-w-0 [--code-block-header-height:--spacing(8)] [--code-block-line-height:1.125rem] [--code-block-padding:--spacing(2)]"
    >
      <CodeBlockHeader className="min-h-8 gap-2 px-2.5">
        <CodeBlockTitle className="truncate">
          {part.filename ?? DOC_FILENAME}
        </CodeBlockTitle>
        <CodeBlockCopyButton className="ms-auto" />
      </CodeBlockHeader>
      {/* No CodeBlockContent and no ScrollArea: the root then owns its own
          scroll, which is the only composition where maxLines applies. */}
      <CodeBlockExpandButton className="pt-6" />
    </CodeBlock>
  )
}

/** Whether anything in the reply points at a numbered source. */
export function hasCitation(parts: MessagePart[]) {
  return parts.some((part) => {
    if (part.kind === "code") return false
    const body = part.kind === "list" ? part.items.join(" ") : part.text
    return /\[\d+\]/.test(body)
  })
}

/** Character length of a part, so one budget spans prose, lists and code. */
export function partLength(part: MessagePart) {
  if (part.kind === "code") return part.code.length
  if (part.kind === "list")
    return part.items.reduce((sum, item) => sum + item.length, 0)
  return part.text.length
}

/** Drops an emphasis run or a citation the slice has not closed yet, so a
    half typed sentence never shows its own markers. */
function closeMarkup(text: string) {
  let out = text.replace(/\[\d*$/, "")
  if ((out.match(/\*\*/g)?.length ?? 0) % 2 === 1)
    out = out.slice(0, out.lastIndexOf("**"))
  if ((out.match(/`/g)?.length ?? 0) % 2 === 1)
    out = out.slice(0, out.lastIndexOf("`"))
  return out
}

/** Snaps a partial slice back to the last word boundary, so a reveal never
    tears a word in half mid frame. */
function sliceWords(text: string, count: number) {
  if (count >= text.length) return text
  const head = text.slice(0, count)
  const boundary = /^[\s\S]*\s/.exec(head)
  return closeMarkup(boundary ? boundary[0] : "")
}

/** Cuts a part to a character budget exactly the way the reveal draws it, so
    a Stop writes back what the reader had on screen and nothing more. */
export function truncatePart(part: MessagePart, budget: number): MessagePart {
  if (part.kind === "code") return { ...part, code: part.code.slice(0, budget) }
  // A heading is drawn whole the moment the reveal reaches it.
  if (part.kind === "heading") return part
  if (part.kind === "list") {
    const items: string[] = []
    let remaining = budget
    for (const item of part.items) {
      if (remaining <= 0) break
      const shown = sliceWords(item, remaining)
      if (shown) items.push(shown)
      remaining -= item.length
    }
    return { ...part, items }
  }
  return { ...part, text: sliceWords(part.text, budget) }
}

/** One part drawn against its budget. Compared by content, not identity: the
    reveal hands out fresh objects, and an identity memo would re-tokenize. */
const PartBody = memo(
  function PartBody({
    part,
    revealed,
    caret = false,
    streaming = false,
    diffAgainst,
    cite,
  }: {
    part: MessagePart
    /** Characters of this part the reveal has let through. */
    revealed: number
    caret?: boolean
    streaming?: boolean
    /** The previous version's text; runs absent from it get a tint. */
    diffAgainst?: string
    cite?: CiteHandlers
  }) {
    const known = diffAgainst
      ? new Set(splitSentences(diffAgainst).map((chunk) => chunk.trim()))
      : null

    if (part.kind === "code")
      return (
        <CodeArtifact
          part={
            revealed < part.code.length
              ? { ...part, code: part.code.slice(0, revealed) }
              : part
          }
          streaming={streaming}
        />
      )

    if (part.kind === "heading")
      return (
        // Lands whole the moment the reveal reaches it: a section title
        // typing itself out is noise, not progress.
        <h3
          className={cn(
            PROSE,
            "text-foreground pt-1 text-base font-semibold tracking-tight"
          )}
        >
          {known && !known.has(part.text.trim()) ? (
            <Tinted>{part.text}</Tinted>
          ) : (
            part.text
          )}
        </h3>
      )

    if (part.kind === "list") {
      const List = part.ordered ? "ol" : "ul"
      let offset = 0
      return (
        <List className={cn(PROSE, "space-y-2")}>
          {part.items.map((item, index) => {
            const start = offset
            offset += item.length
            const shown = sliceWords(item, Math.max(0, revealed - start))
            if (!shown) return null
            const tinted = known !== null && !known.has(item.trim())
            const body = renderInline(shown, cite)
            return (
              <li key={index} className="flex min-w-0 gap-2.5">
                {part.ordered ? (
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground w-4 shrink-0 text-end tabular-nums"
                  >
                    {index + 1}.
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="bg-muted-foreground/40 mt-2.5 size-1 shrink-0 rounded-full"
                  />
                )}
                <span className="min-w-0 flex-1">
                  {tinted ? <Tinted>{body}</Tinted> : body}
                  {caret && shown.length < item.length ? <Caret /> : null}
                </span>
              </li>
            )
          })}
        </List>
      )
    }

    return (
      <ProseText
        text={sliceWords(part.text, revealed)}
        known={known}
        cite={cite}
        caret={caret}
      />
    )
  },
  (previous, next) =>
    previous.revealed === next.revealed &&
    previous.caret === next.caret &&
    previous.streaming === next.streaming &&
    previous.diffAgainst === next.diffAgainst &&
    previous.cite === next.cite &&
    previous.part === next.part
)

/** Ticks a reply takes to land, and how long each holds. Both are fixed, so
    a long answer types faster rather than outstaying its welcome. */
const REVEAL_TICKS = 52
const REVEAL_MS = 28
/** The caret rests a beat on the last word before the run settles. */
const SETTLE_MS = 120

/** Whether the viewer asked for reduced motion, readable during render. */
function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/** One character budget spent across the parts. `onDone` settles the run the
    moment the last character lands (no guessed timer); `frozen` holds a Stop. */
export function useRevealBudget(
  nodeId: string,
  parts: MessagePart[],
  active: boolean,
  frozen: boolean,
  onDone: () => void
) {
  const total = parts.reduce((sum, part) => sum + partLength(part), 0)
  const step = Math.max(2, Math.round(total / REVEAL_TICKS))
  // Reduced motion seeds whole: the first frame must never flash a stub that
  // the effect then replaces.
  const seed = active && !frozen && !reducedMotion() ? step : total
  // Each version renders under its own key, so a switch remounts this hook
  // and the seed above is what a fresh version starts from.
  const [budget, setBudget] = useState(seed)

  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (!active || frozen) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBudget(total)
      return
    }
    const tickStep = Math.max(2, Math.round(total / REVEAL_TICKS))
    setBudget(tickStep)
    const timer = window.setInterval(() => {
      setBudget((current) => {
        const next = Math.min(total, current + tickStep)
        if (next === total) window.clearInterval(timer)
        return next
      })
    }, REVEAL_MS)
    return () => window.clearInterval(timer)
  }, [nodeId, total, active, frozen])

  useEffect(() => {
    if (!active || frozen || budget < total) return
    const timer = window.setTimeout(() => doneRef.current(), SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [active, frozen, budget, total])

  if (frozen) return Math.min(budget, total)
  // A settled version renders whole on the very render it is switched to,
  // without waiting for the effect to resync the state.
  return active ? budget : total
}

/** Walks the parts against one budget and hands each the slice it has earned. */
export function ReplyBody({
  parts,
  budget,
  streaming = false,
  diffAgainst,
  cite,
}: {
  parts: MessagePart[]
  budget: number
  streaming?: boolean
  diffAgainst?: string
  cite?: CiteHandlers
}) {
  let offset = 0
  return (
    <>
      {parts.map((part, index) => {
        const start = offset
        const length = partLength(part)
        offset += length
        const revealed = Math.min(length, Math.max(0, budget - start))
        // Parts the budget has not reached stay off screen, and after a Stop
        // they stay off screen for good.
        if (revealed === 0 || length === 0) return null
        // The part the budget sits inside is the one typing right now.
        const current = budget > start && budget <= start + length
        return (
          <PartBody
            key={index}
            part={part}
            // A heading lands whole as soon as the reveal reaches it.
            revealed={part.kind === "heading" ? length : revealed}
            caret={streaming && current}
            streaming={streaming && current}
            diffAgainst={diffAgainst}
            cite={cite}
          />
        )
      })}
    </>
  )
}