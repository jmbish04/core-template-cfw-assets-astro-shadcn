import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { type ReasoningRecord, type SourceRecord } from "./data"
import { BrainIcon, ChevronRightIcon, FileTextIcon, MessageSquareIcon, TicketPercentIcon, DatabaseIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_REASONING = (
  <BrainIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_DISCLOSE = (
  <ChevronRightIcon className="size-3.5 shrink-0 transition-transform in-data-open:rotate-90" aria-hidden="true" />
)

const ICON_DOC = (
  <FileTextIcon className="size-4" aria-hidden="true" />
)

const ICON_THREAD = (
  <MessageSquareIcon className="size-4" aria-hidden="true" />
)

const ICON_TICKETS = (
  <TicketPercentIcon className="size-4" aria-hidden="true" />
)

const ICON_DATA = (
  <DatabaseIcon className="size-4" aria-hidden="true" />
)

/** One glyph per source kind, so a thread never reads as a checked in file. */
const KIND_ICONS: Record<SourceRecord["kind"], React.ReactNode> = {
  doc: ICON_DOC,
  thread: ICON_THREAD,
  tickets: ICON_TICKETS,
  data: ICON_DATA,
}

/** Shared with the composer, so a document attached to an ask carries the
    same glyph as the source the reply cites back. */
export function SourceGlyph({ kind }: { kind: SourceRecord["kind"] }) {
  return KIND_ICONS[kind]
}

/** The pass behind a reply. Closed at rest: the answer is the point, and the
    working is there for the reader who doubts it. */
export function ReasoningDisclosure({
  reasoning,
}: {
  reasoning: ReasoningRecord
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Reasoning, thought for ${reasoning.seconds} seconds`}
            className="text-muted-foreground hover:text-foreground -ms-2 h-7 gap-1.5 px-2 text-[13px] font-normal"
          />
        }
      >
        {ICON_DISCLOSE}
        {ICON_REASONING}
        Thought for <span className="tabular-nums">{reasoning.seconds}s</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-1 data-open:duration-200 motion-reduce:data-open:animate-none">
        <ol className="border-border text-muted-foreground ms-2 mt-1.5 space-y-1.5 border-s ps-3.5 text-[13px]/5">
          {reasoning.steps.map((step) => (
            <li key={step} className="max-w-[64ch]">
              {step}
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** The documents a reply read, numbered to match its inline citations.
    Selecting one lights every citation pointing at it, and the other way round. */
export function SourceStrip({
  sources,
  numbered,
  activeSourceId,
  onCite,
}: {
  sources: SourceRecord[]
  /** False when nothing in the reply cites them, so the rows carry no index
      the reader could look for and never find. */
  numbered: boolean
  activeSourceId: string | null
  onCite: (id: string | null) => void
}) {
  return (
    <section aria-label="Sources" className="flex min-w-0 flex-col gap-1.5">
      <h4 className="text-muted-foreground text-[13px] font-medium">
        <span className="tabular-nums">{sources.length}</span>{" "}
        {numbered
          ? sources.length === 1
            ? "Source"
            : "Sources"
          : sources.length === 1
            ? "Document Read"
            : "Documents Read"}
      </h4>
      {/* The group scrolls rather than wraps, so a reply that read six things
          never grows a second row under the answer. */}
      <AttachmentGroup className="gap-2 pb-1">
        {sources.map((source, index) => {
          const active = activeSourceId === source.id
          return (
            <Attachment
              key={source.id}
              size="xs"
              data-active={active}
              className="data-[active=true]:border-primary/50 data-[active=true]:bg-primary/5 max-w-56 transition-colors"
            >
              <AttachmentMedia variant="icon" className="text-muted-foreground">
                <SourceGlyph kind={source.kind} />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle className="flex items-center gap-1.5 text-[13px]">
                  {numbered ? (
                    <span className="text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate">{source.title}</span>
                </AttachmentTitle>
                <AttachmentDescription>{source.meta}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentTrigger
                aria-label={
                  numbered
                    ? `Source ${index + 1}, ${source.title}`
                    : `Source, ${source.title}`
                }
                aria-pressed={active}
                onClick={() => onCite(active ? null : source.id)}
              />
            </Attachment>
          )
        })}
      </AttachmentGroup>
    </section>
  )
}