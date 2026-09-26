import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { COMPOSER_PLACEHOLDER, MESSAGE_LIMIT, PRODUCT_NAME } from "./data"
import { ArrowUpIcon } from "lucide-react"

const COMPOSER_ID = "ai-chat-12-composer"

/** How close to the ceiling the counter starts warning. */
const COUNTER_WARNING_AT = 50

const ICON_SEND = (
  <ArrowUpIcon className="size-4" aria-hidden="true" />
)

/**
 * One box: the question, what is left of the budget, and the way to send it.
 * The footer sits inside the field, so the whole composer reads as one control.
 */
export function Composer({
  streaming,
  onSend,
  onStop,
}: {
  /** True from the moment a question is sent until its answer settles. */
  streaming: boolean
  onSend: (text: string) => void
  onStop: () => void
}) {
  const [value, setValue] = useState("")
  const box = useRef<HTMLTextAreaElement>(null)

  const remaining = MESSAGE_LIMIT - value.length

  function send(text: string) {
    // While an answer is in flight the only primary action is Stop, so Enter
    // and the form must not slip a second question past it.
    if (streaming) return
    const trimmed = text.trim()
    // The send control never disables, so an empty press puts the caret back
    // in the box rather than doing nothing at all.
    if (!trimmed) {
      box.current?.focus()
      return
    }
    setValue("")
    onSend(trimmed)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send(value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter breaks the line. An IME candidate window also
    // fires Enter, and committing a word there must not post the message.
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return
    event.preventDefault()
    send(value)
  }

  return (
    <form onSubmit={submit}>
      <Field>
        <FieldLabel htmlFor={COMPOSER_ID} className="sr-only">
          Ask about {PRODUCT_NAME}
        </FieldLabel>
        <InputGroup>
          <InputGroupTextarea
            id={COMPOSER_ID}
            ref={box}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={COMPOSER_PLACEHOLDER}
            maxLength={MESSAGE_LIMIT}
            // Starts one line and grows with the text, capped so the
            // transcript never loses the panel.
            className="field-sizing-content max-h-32 min-h-9"
          />

          <InputGroupAddon align="block-end" className="justify-between gap-2">
            {/* role=status would announce every keystroke. */}
            <span
              aria-hidden="true"
              data-low={remaining <= COUNTER_WARNING_AT || undefined}
              className="text-muted-foreground data-low:text-destructive text-xs tabular-nums"
            >
              {value.length} / {MESSAGE_LIMIT}
            </span>

            {streaming ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onStop}
              >
                Stop
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="submit"
                      size="icon-sm"
                      aria-label="Send question"
                      className="rounded-full"
                    />
                  }
                >
                  {ICON_SEND}
                </TooltipTrigger>
                <TooltipContent className="flex items-center gap-1.5">
                  Send
                  <Kbd>Enter</Kbd>
                </TooltipContent>
              </Tooltip>
            )}
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </form>
  )
}