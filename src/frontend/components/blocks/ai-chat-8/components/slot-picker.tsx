import { useState } from "react"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { formatLength, formatTime, type SlotRecord } from "./data"
import { SendIcon } from "lucide-react"

const ICON_SEND = (
  <SendIcon className="size-4" aria-hidden="true" />
)

/**
 * A set of times to choose between. Picking is separate from sending, so a
 * mis-tap never books a meeting on someone else's calendar.
 */
export function SlotPicker({
  lead,
  options,
  question,
  taken,
  onConfirm,
}: {
  lead: string
  options: SlotRecord[]
  question: string
  /** The slot already sent, if this turn has been answered. */
  taken: string | null
  onConfirm: (slot: SlotRecord) => void
}) {
  const [picked, setPicked] = useState<string>("")
  const choice = options.find((slot) => slot.id === picked)
  const sent = options.find((slot) => slot.id === taken)

  function slotLabel(slot: SlotRecord) {
    return slot.day
      ? `${slot.day}, ${formatTime(slot.startsAt)}`
      : formatTime(slot.startsAt)
  }

  return (
    <Bubble variant="outline" className="max-w-full">
      <BubbleContent className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed">{lead}</p>

        {sent ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            Invite sent for {slotLabel(sent)}, {formatLength(sent.minutes)}.
          </p>
        ) : (
          <>
            <ToggleGroup
              multiple={false}
              value={picked ? [picked] : []}
              onValueChange={(value) => setPicked(value[0] ?? "")}
              variant="outline"
              size="sm"
              spacing={2}
              orientation="vertical"
              aria-label="Available times"
              className="w-full"
            >
              {options.map((slot) => (
                <ToggleGroupItem
                  key={slot.id}
                  value={slot.id}
                  className="h-auto w-full justify-start gap-2 px-2.5 py-2 font-normal"
                >
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {slotLabel(slot)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
                  />
                  <span className="text-muted-foreground min-w-0 truncate text-xs">
                    {slot.detail}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground min-w-0 text-xs">
                {question}
              </p>
              <Button
                type="button"
                size="sm"
                disabled={!choice}
                onClick={() => choice && onConfirm(choice)}
                className="shrink-0 gap-1.5"
              >
                {ICON_SEND}
                Send
              </Button>
            </div>
          </>
        )}
      </BubbleContent>
    </Bubble>
  )
}