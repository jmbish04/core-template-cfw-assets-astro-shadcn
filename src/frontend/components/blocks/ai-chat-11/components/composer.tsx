import type { FormEvent, KeyboardEvent, RefObject } from "react"
import {
  Frame,
  FrameHeader,
  FramePanel,
} from "@/components/reui/frame"
import { cn } from "@/lib/utils"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { GLASS } from "./answer-slab"
import { ASSISTANT_NAME, MODELS, SOURCES } from "./data"
import { PlusIcon, ChevronDownIcon, ArrowUpIcon } from "lucide-react"

const FIELD_ID = "ai-chat-11-composer"

/**
 * The ask box: a dense Frame whose header band carries the sources this run may
 * read, so scope reads as a setting on the ask rather than as more content.
 */
export function Composer({
  value,
  onValueChange,
  fieldRef,
  modelId,
  onModelChange,
  scopeIds,
  onScopeChange,
  streaming,
  onSend,
  onStop,
}: {
  value: string
  onValueChange: (next: string) => void
  /** Starters and quick replies fill this field, so the caret must land in it. */
  fieldRef: RefObject<HTMLTextAreaElement | null>
  modelId: string
  onModelChange: (id: string) => void
  scopeIds: string[]
  /** The whole pressed set, straight from the toggle group. */
  onScopeChange: (next: string[]) => void
  streaming: boolean
  onSend: (text: string) => void
  onStop: () => void
}) {
  const model = MODELS.find((entry) => entry.id === modelId) ?? MODELS[0]
  // An unscoped run has nothing to read, so the field says so and send holds.
  const scoped = scopeIds.length > 0
  const canSend = value.trim().length > 0 && scoped

  function send() {
    // The send control never disables, so a blocked press returns the caret
    // rather than doing nothing at all.
    if (!canSend) {
      fieldRef.current?.focus()
      return
    }
    onSend(value.trim())
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
    <Frame dense spacing="sm" className={cn(GLASS, "w-full")}>
      {/* Scope band: chrome above the field, so the sources read as a setting
          on the ask rather than as another block of content. */}
      <FrameHeader>
        <ToggleGroup
          multiple
          variant="outline"
          size="sm"
          value={scopeIds}
          onValueChange={(next) => onScopeChange(next)}
          aria-label="Sources this run can read"
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
              placeholder={
                scoped
                  ? "Ask anything about this incident"
                  : "Pick a source for this run to read"
              }
              // Grows with the draft, capped so a long ask never pushes the
              // toolbar off a short viewport.
              className="field-sizing-content max-h-40 min-h-16"
            />

            <InputGroupAddon align="block-end" className="gap-1.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      size="icon-sm"
                      aria-label="Attach a file"
                      className="rounded-full"
                    />
                  }
                >
                  <PlusIcon className="size-4" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>Attach</TooltipContent>
              </Tooltip>

              {/* Model picker: a radio menu, because it sets a value. */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <InputGroupButton
                      size="sm"
                      aria-label={`Model, ${model.name}`}
                      className="gap-1.5"
                    />
                  }
                >
                  {model.logo}
                  <span className="max-w-24 truncate sm:max-w-none">
                    {model.name}
                  </span>
                  <ChevronDownIcon className="opacity-60" data-icon="inline-end" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-72">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Model</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuRadioGroup
                    value={modelId}
                    onValueChange={(next) => next && onModelChange(next)}
                  >
                    {MODELS.map((entry) => (
                      <DropdownMenuRadioItem
                        key={entry.id}
                        value={entry.id}
                        // Base UI defaults a radio item to closeOnClick false;
                        // a single model choice should dismiss the menu.
                        closeOnClick
                        className="gap-2"
                      >
                        {entry.logo}
                        <span className="min-w-0 flex-1 truncate">
                          {entry.name}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {entry.context}
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="ms-auto flex items-center gap-1.5">
                <Kbd className="hidden sm:inline-flex">Enter</Kbd>

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
                          className={cn(
                            "rounded-full transition-opacity",
                            !canSend && "opacity-60"
                          )}
                        />
                      }
                    >
                      <ArrowUpIcon className="size-4" aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent>Send</TooltipContent>
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