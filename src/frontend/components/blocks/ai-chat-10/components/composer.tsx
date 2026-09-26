import { useEffect, type FormEvent, type KeyboardEvent } from "react"
import {
  Frame,
  FrameHeader,
  FramePanel,
} from "@/components/reui/frame"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ASSISTANT_NAME, MODELS, SOURCES } from "./data"
import { PaperclipIcon, ChevronDownIcon, SendIcon } from "lucide-react"

const FIELD_ID = "ai-chat-10-composer"

/**
 * Ask box for the whole block. The frame header holds the sources this chat may
 * read: switch one off and the next reply names the gap instead of guessing.
 */
export function Composer({
  value,
  onValueChange,
  fieldRef,
  scopeIds,
  onScopeChange,
  modelId,
  onModelChange,
  streaming,
  onSend,
  onStop,
}: {
  value: string
  onValueChange: (next: string) => void
  /** Starters and presets fill this field, so the caret has to land in it. */
  fieldRef: React.RefObject<HTMLTextAreaElement | null>
  scopeIds: string[]
  /** The whole pressed set, straight from the toggle group. */
  onScopeChange: (next: string[]) => void
  modelId: string
  onModelChange: (id: string) => void
  streaming: boolean
  onSend: (text: string) => void
  onStop: () => void
}) {
  const canSend = value.trim().length > 0
  const activeModel = MODELS.find((model) => model.id === modelId) ?? MODELS[0]
  // The ask box is the point of the surface, welcome or docked, so it takes
  // the caret whichever one mounted it.
  useEffect(() => {
    fieldRef.current?.focus()
  }, [fieldRef])

  /** Appends the filename; the menu's finalFocus returns the caret. */
  function mention(name: string) {
    const draft = value.trimEnd()
    onValueChange(draft ? `${draft} ${name} ` : `${name} `)
  }

  function send() {
    // The send control never disables, so an empty press puts the caret back
    // in the field rather than doing nothing at all.
    if (!canSend) {
      fieldRef.current?.focus()
      return
    }
    onSend(value.trim())
    fieldRef.current?.focus()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send()
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
    send()
  }

  return (
    // dense pulls the panel flush to the frame edge, so the scope band and the
    // field read as one control rather than two stacked boxes.
    <Frame dense spacing="sm" className="w-full">
      {/* Scope band: chrome above the field, so the sources read as a setting
          on the ask rather than as another block of content. */}
      <FrameHeader>
        <ToggleGroup
          multiple
          variant="outline"
          size="sm"
          value={scopeIds}
          onValueChange={(next) => onScopeChange(next)}
          aria-label="Sources this chat can read"
          className="w-full flex-wrap"
        >
          {SOURCES.map((source) => (
            // The toggle's stock pressed fill is bg-muted and this band is
            // bg-muted/50, so an on chip lifts to the card surface instead.
            <ToggleGroupItem
              key={source.id}
              value={source.id}
              className="text-muted-foreground data-pressed:bg-card data-pressed:text-foreground min-w-0 font-normal data-pressed:shadow-xs"
            >
              {source.icon}
              <span className="max-w-40 min-w-0 truncate">{source.name}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FrameHeader>

      <FramePanel className="p-0">
        <form onSubmit={submit}>
          <FieldLabel className="sr-only" htmlFor={FIELD_ID}>
            Message {ASSISTANT_NAME}
          </FieldLabel>

          <InputGroup className="border-0 bg-transparent shadow-none">
            <InputGroupTextarea
              id={FIELD_ID}
              ref={fieldRef}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about churn, the webhook, or anything you connected..."
              // Starts three lines and grows with the text, capped so a long
              // draft never pushes the toolbar off a short viewport.
              className="field-sizing-content max-h-48 min-h-20"
            />

            <InputGroupAddon align="block-end" className="gap-1">
              {/* Drops a filename into the draft, so an ask can point at one
                  file even while the whole set stays in scope. */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <InputGroupButton
                      size="icon-sm"
                      aria-label="Mention a file"
                    />
                  }
                >
                  <PaperclipIcon aria-hidden="true" />
                </DropdownMenuTrigger>
                {/* Closing hands the caret to the draft, not back to the
                    paperclip: the filename it just added needs typing after it. */}
                <DropdownMenuContent
                  align="start"
                  finalFocus={fieldRef}
                  className="w-60"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Mention a file</DropdownMenuLabel>
                    {SOURCES.map((source) => (
                      <DropdownMenuItem
                        key={source.id}
                        onClick={() => mention(source.name)}
                        className="gap-2"
                      >
                        {source.icon}
                        <span className="min-w-0 flex-1 truncate">
                          {source.name}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="ms-auto flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <InputGroupButton
                        size="sm"
                        variant="outline"
                        aria-label={`Model, ${activeModel.name}`}
                        className="gap-1.5"
                      />
                    }
                  >
                    {activeModel.logo}
                    <span className="max-w-24 truncate sm:max-w-none">
                      {activeModel.name}
                    </span>
                    <ChevronDownIcon className="opacity-60" data-icon="inline-end" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Model</DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuRadioGroup
                      value={modelId}
                      onValueChange={(next) => next && onModelChange(next)}
                    >
                      {MODELS.map((model) => (
                        <DropdownMenuRadioItem
                          key={model.id}
                          value={model.id}
                          className="gap-2"
                        >
                          {model.logo}
                          <span className="min-w-0 flex-1 truncate">
                            {model.name}
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* One primary slot: Stop replaces Send while a reply runs. */}
                {streaming ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <InputGroupButton
                          size="icon-sm"
                          variant="outline"
                          onClick={onStop}
                          aria-label="Stop generating"
                          className="rounded-full"
                        />
                      }
                    >
                      {/* A filled square is the stop glyph everywhere, and it
                          costs no icon mapping to draw. */}
                      <span
                        aria-hidden="true"
                        className="bg-foreground size-2.5 rounded-xs"
                      />
                    </TooltipTrigger>
                    <TooltipContent>Stop generating</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <InputGroupButton
                          type="submit"
                          size="icon-sm"
                          variant="default"
                          aria-label="Send message"
                          className="rounded-full"
                        />
                      }
                    >
                      <SendIcon aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent className="flex items-center gap-1.5">
                      Send
                      <Kbd>Enter</Kbd>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </FramePanel>
    </Frame>
  )
}