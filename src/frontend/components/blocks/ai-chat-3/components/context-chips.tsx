import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentGroup,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { CONTEXT_SOURCES } from "./data"
import { XIcon } from "lucide-react"

/**
 * What the assistant was given to read, in the composer before a send and on
 * the sent turn after it. Pass onRemove only while it is still editable.
 */
export function ContextChips({
  ids,
  onRemove,
  className,
}: {
  ids: string[]
  onRemove?: (id: string) => void
  className?: string
}) {
  const sources = CONTEXT_SOURCES.filter((source) => ids.includes(source.id))
  if (sources.length === 0) return null

  return (
    <AttachmentGroup aria-label="Attached context" className={className}>
      {sources.map((source) => (
        <Attachment key={source.id} size="xs" className="max-w-56">
          {/* Bare: the chip already paints the surface a media box would. */}
          <span
            aria-hidden="true"
            className="text-muted-foreground shrink-0 [&>svg]:size-3.5"
          >
            {source.icon}
          </span>
          <AttachmentContent>
            <AttachmentTitle>{source.chip}</AttachmentTitle>
          </AttachmentContent>
          {onRemove ? (
            <AttachmentActions>
              <AttachmentAction
                type="button"
                aria-label={`Remove ${source.chip}`}
                onClick={() => onRemove(source.id)}
              >
                <XIcon aria-hidden="true" />
              </AttachmentAction>
            </AttachmentActions>
          ) : null}
        </Attachment>
      ))}
    </AttachmentGroup>
  )
}