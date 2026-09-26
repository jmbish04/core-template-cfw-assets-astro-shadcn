import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { SOURCES } from "./data"
import { XIcon } from "lucide-react"

/**
 * What the assistant was given to read: in the composer before a send and on
 * the turn after it. Pass onRemove only while the set is still editable.
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
  const sources = SOURCES.filter((source) => ids.includes(source.id))
  if (sources.length === 0) return null

  return (
    <AttachmentGroup aria-label="Attached sources" className={className}>
      {sources.map((source) => (
        // min-w-0 drops the primitive's 160px floor: without it a short
        // filename leaves slack and the reveal below appears to do nothing.
        <Attachment
          key={source.id}
          size="xs"
          className="group/chip max-w-72 min-w-0"
        >
          <AttachmentMedia>{source.icon}</AttachmentMedia>
          <AttachmentContent className="flex items-baseline">
            <AttachmentTitle className="min-w-0 truncate">
              {source.name}
            </AttachmentTitle>
            {/* A 0fr track hides the kind without taking a row of its own.
                Collapsed only under a fine pointer, since touch has no hover. */}
            <span className="grid grid-cols-[1fr] opacity-100 transition-[grid-template-columns,opacity] duration-200 ease-out motion-reduce:transition-none pointer-fine:grid-cols-[0fr] pointer-fine:opacity-0 pointer-fine:group-hover/chip:grid-cols-[1fr] pointer-fine:group-hover/chip:opacity-100">
              {/* The gap rides an inner span: padding on the track itself
                  survives 0fr and leaves the chip 6px wider than it needs. */}
              <AttachmentDescription className="mt-0 min-w-0 overflow-hidden text-clip whitespace-nowrap">
                <span className="ps-1.5">{source.kindLabel}</span>
              </AttachmentDescription>
            </span>
          </AttachmentContent>
          {onRemove ? (
            <AttachmentActions>
              <AttachmentAction
                type="button"
                aria-label={`Remove ${source.name}`}
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