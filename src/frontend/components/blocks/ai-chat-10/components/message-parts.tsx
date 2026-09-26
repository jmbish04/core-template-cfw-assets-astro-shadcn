"use client"

/**
 * The reply body. An answer from a source grounded assistant is a small
 * structured document, not one flat paragraph: it can hand back a table, a
 * ranked comparison or a real code artifact, and each lands whole while the
 * prose around it is still typing.
 */
import { memo, useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockExpandButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/reui/code-block/code-block"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { STATUS_BADGE, type MessagePart, type TableColumn } from "./data"
import { ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_SORT_NONE = (
  <ChevronsUpDownIcon className="size-3 opacity-40" aria-hidden="true" />
)

const ICON_SORT_ASC = (
  <ChevronUpIcon className="size-3" aria-hidden="true" />
)

const ICON_SORT_DESC = (
  <ChevronDownIcon className="size-3" aria-hidden="true" />
)

/** Lines an artifact shows before it offers to expand. Fourteen is the tallest
    block that still leaves the next turn on screen at 900px. */
const ARTIFACT_LINES = 14

/** How much reveal budget one table row or one metric bar is worth, so a
    structured part arrives at a readable pace beside the prose. */
const CHARS_PER_ROW = 44

// ---------- reveal budget ----------

/** Character length of a part, so one budget spans prose, tables and code. */
export function partLength(part: MessagePart) {
  if (part.kind === "text") return part.text.length
  if (part.kind === "code") return part.code.length
  if (part.kind === "table") return part.rows.length * CHARS_PER_ROW
  return part.items.length * CHARS_PER_ROW
}

/** Cuts one part at the revealed character. Code lands a line at a time and
    rows land whole: half a row is a broken table, not a partial one. */
export function slicePart(part: MessagePart, budget: number): MessagePart {
  if (part.kind === "text") {
    const cut = part.text.slice(0, budget)
    // Snap back to the last whitespace: a caret parked mid word is the tell
    // that a reveal is counting characters rather than emitting tokens.
    const boundary = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("\n"))
    return { ...part, text: boundary > 0 ? cut.slice(0, boundary) : cut }
  }
  if (part.kind === "table") {
    const reached = Math.max(1, Math.floor(budget / CHARS_PER_ROW))
    return { ...part, rows: part.rows.slice(0, reached) }
  }
  if (part.kind === "metrics") {
    const reached = Math.max(1, Math.floor(budget / CHARS_PER_ROW))
    return { ...part, items: part.items.slice(0, reached) }
  }
  const lines = part.code.split("\n")
  const reached = Math.max(
    1,
    Math.floor((budget / part.code.length) * lines.length)
  )
  // No trailing newline: it would render as an empty numbered code line.
  return { ...part, code: lines.slice(0, reached).join("\n") }
}

/** Flattens a part to plain text, so Copy hands over what was read. */
export function partText(part: MessagePart) {
  if (part.kind === "text") return part.text
  if (part.kind === "code") return part.code
  if (part.kind === "metrics")
    return part.items.map((item) => `${item.label}\t${item.display}`).join("\n")
  // Tab separated, so a pasted table lands in a spreadsheet as columns.
  const head = part.columns.map((column) => column.label).join("\t")
  const body = part.rows
    .map((row) =>
      part.columns
        .map((column) => {
          const value = row[column.key]
          return column.badge
            ? (STATUS_BADGE[String(value)]?.label ?? String(value))
            : String(value)
        })
        .join("\t")
    )
    .join("\n")
  return `${head}\n${body}`
}

// ---------- artifacts ----------

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
      streaming={streaming}
      maxLines={ARTIFACT_LINES}
      className="w-full min-w-0 [--code-block-header-height:--spacing(8)] [--code-block-line-height:1.125rem] [--code-block-padding:--spacing(2)]"
    >
      <CodeBlockHeader className="min-h-8 gap-2 px-2.5">
        <CodeBlockTitle className="truncate">{part.filename}</CodeBlockTitle>
        <CodeBlockCopyButton className="ms-auto" />
      </CodeBlockHeader>
      {/* No CodeBlockContent and no ScrollArea: the root then owns its own
          scroll, which is the only composition where maxLines applies. */}
      <CodeBlockExpandButton className="pt-6" />
    </CodeBlock>
  )
}

type SortState = { key: string; direction: "asc" | "desc" } | null

/** Numbers are stored raw so a footer can total them; the comma arrives here. */
function cellText(value: string | number, column: TableColumn) {
  if (column.badge) return STATUS_BADGE[String(value)]?.label ?? String(value)
  return typeof value === "number" ? value.toLocaleString("en-US") : value
}

/**
 * A table answer. Sorting is local to the artifact, so re-ranking the rows to
 * read them another way never edits the order the answer actually returned.
 */
function TableArtifact({
  part,
  streaming = false,
}: {
  part: Extract<MessagePart, { kind: "table" }>
  streaming?: boolean
}) {
  const [sort, setSort] = useState<SortState>(null)
  const first = part.columns[0]

  const rows = sort
    ? [...part.rows].sort((left, right) => {
        const a = left[sort.key]
        const b = right[sort.key]
        const gap =
          typeof a === "number" && typeof b === "number"
            ? a - b
            : String(a).localeCompare(String(b))
        return sort.direction === "asc" ? gap : -gap
      })
    : part.rows

  // Totals are summed from the rows on screen, so a half revealed table never
  // shows a figure its own body does not add up to.
  const totals = part.columns.map((column) =>
    column.total
      ? rows.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0)
      : null
  )

  /** Descending first: the interesting end of a count column is the top. */
  function toggle(key: string) {
    setSort((current) =>
      current?.key !== key
        ? { key, direction: "desc" }
        : current.direction === "desc"
          ? { key, direction: "asc" }
          : null
    )
  }

  return (
    <Table className="text-xs">
      <TableCaption className="sr-only">{part.caption}</TableCaption>
      <TableHeader>
        <TableRow>
          {part.columns.map((column) => {
            const active = sort?.key === column.key
            return (
              <TableHead
                key={column.key}
                aria-sort={
                  active
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className={column.numeric ? "text-end" : undefined}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Sort by ${column.label}`}
                  onClick={() => toggle(column.key)}
                  className={cn(
                    "-mx-2 h-7 gap-1 px-2 text-xs font-medium",
                    // Glyph ahead of the label so a right aligned header keeps
                    // its word nearest the digits it counts.
                    column.numeric && "flex-row-reverse"
                  )}
                >
                  {column.label}
                  {active
                    ? sort.direction === "asc"
                      ? ICON_SORT_ASC
                      : ICON_SORT_DESC
                    : ICON_SORT_NONE}
                </Button>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={String(row[first.key])}>
            {part.columns.map((column) => {
              const value = row[column.key]
              const status = column.badge
                ? STATUS_BADGE[String(value)]
                : undefined
              return (
                <TableCell
                  key={column.key}
                  className={cn(
                    column.numeric && "text-end tabular-nums",
                    !column.numeric &&
                      column.key === first.key &&
                      "text-foreground font-medium"
                  )}
                >
                  {status ? (
                    <Badge variant={status.variant} size="sm">
                      {status.label}
                    </Badge>
                  ) : (
                    cellText(value, column)
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
      {/* Held back mid stream: a total is only true once every row has landed. */}
      {streaming || totals.every((total) => total === null) ? null : (
        <TableFooter>
          <TableRow>
            {part.columns.map((column, index) => (
              <TableCell
                key={column.key}
                className={column.numeric ? "text-end tabular-nums" : undefined}
              >
                {index === 0
                  ? "Total"
                  : totals[index] === null
                    ? null
                    : totals[index]?.toLocaleString("en-US")}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}

/**
 * A comparison. Each bar is drawn and announced against the part's own
 * denominator, so what a reader hears matches what the row says.
 */
function MetricsArtifact({
  part,
}: {
  part: Extract<MessagePart, { kind: "metrics" }>
}) {
  return (
    <div role="group" aria-label={part.caption} className="flex flex-col gap-2">
      {part.items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span
              className={cn(
                "min-w-0 truncate",
                item.lead ? "text-foreground font-medium" : "text-foreground"
              )}
            >
              {item.label}
            </span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {item.display}
            </span>
          </div>
          {/* The lead row is the one the sentence names; every other bar reads
              as the baseline it is being measured against. */}
          <Progress
            value={item.value}
            max={part.max}
            aria-label={`${item.label}, ${item.display}`}
            className={cn(
              "h-1.5 [&_[data-slot=progress-track]]:h-1.5",
              !item.lead && "[&_[data-slot=progress-indicator]]:bg-primary/35"
            )}
          />
        </div>
      ))}
    </div>
  )
}

// ---------- part switch ----------

/** Compared by content, not identity: the reveal hands out fresh part objects
    every tick, so a referential memo would re-highlight code ~33 times a second. */
export const PartBody = memo(
  function PartBody({ part, caret }: { part: MessagePart; caret?: boolean }) {
    if (part.kind === "code")
      return <CodeArtifact part={part} streaming={caret} />

    if (part.kind === "table")
      return <TableArtifact part={part} streaming={caret} />

    if (part.kind === "metrics") return <MetricsArtifact part={part} />

    // Split rather than match a closed pair: mid type the closing backtick has
    // not arrived, and a lone one must never surface as a character.
    const segments = part.text.split("`")

    return (
      <p className="whitespace-pre-wrap">
        {segments.map((segment, index) =>
          index % 2 === 1 ? (
            <code
              key={index}
              className="bg-muted rounded-sm px-1 py-0.5 font-mono text-[0.85em]"
            >
              {segment}
            </code>
          ) : (
            segment
          )
        )}
        {caret ? (
          <span
            className="bg-foreground ms-0.5 inline-block h-[1em] w-0.5 translate-y-0.5"
            aria-hidden="true"
          />
        ) : null}
      </p>
    )
  },
  (previous, next) => {
    if (previous.caret !== next.caret) return false
    const before = previous.part
    const after = next.part
    if (before.kind === "text" && after.kind === "text")
      return before.text === after.text
    if (before.kind === "code" && after.kind === "code")
      return before.code === after.code
    // Rows and bars arrive whole, so their count is all that can change.
    if (before.kind === "table" && after.kind === "table")
      return before.rows.length === after.rows.length
    if (before.kind === "metrics" && after.kind === "metrics")
      return before.items.length === after.items.length
    return false
  }
)