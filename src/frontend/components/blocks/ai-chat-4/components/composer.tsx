import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ASSISTANT_NAME,
  COMPOSER_PLACEHOLDER,
  MODELS,
  MODES,
  SOURCES,
  SUGGESTIONS,
  type SourceRecord,
} from "./data"
import { MessageSquareTextIcon, FileTextIcon, XIcon, PlusIcon, SparklesIcon, ArrowUpIcon, CornerDownRightIcon, ChevronDownIcon } from "lucide-react"

const COMPOSER_ID = "ai-chat-4-composer"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_QUOTE = (
  <MessageSquareTextIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_FILE = (
  <FileTextIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_CLOSE = (
  <XIcon aria-hidden="true" />
)

const ICON_ADD = (
  <PlusIcon aria-hidden="true" />
)

const ICON_SPARK = (
  <SparklesIcon aria-hidden="true" />
)

const ICON_SEND = (
  <ArrowUpIcon aria-hidden="true" />
)

const ICON_ROW = (
  <CornerDownRightIcon className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
)

const ICON_CHEVRON = (
  <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
)

export function Composer({
  streaming,
  webSearch,
  quote,
  onQuoteChange,
  attachments,
  onAttach,
  onDetach,
  modelId,
  onModelChange,
  modeId,
  onModeChange,
  draft,
  onSend,
  onStop,
}: {
  streaming: boolean
  /** Set in the panel's settings menu; the note under the box reports it. */
  webSearch: boolean
  /** The sentence this message is answering, or null for a fresh question. */
  quote: string | null
  onQuoteChange: (quote: string | null) => void
  attachments: SourceRecord[]
  onAttach: (source: SourceRecord) => void
  onDetach: (id: string) => void
  modelId: string
  onModelChange: (id: string) => void
  modeId: string
  onModeChange: (id: string) => void
  /** Text Edit sends back down; the serial re-loads an identical text. */
  draft: { text: string; serial: number } | null
  onSend: (text: string) => void
  onStop: () => void
}) {
  const [value, setValue] = useState("")
  const [paletteOpen, setPaletteOpen] = useState(true)
  const box = useRef<HTMLTextAreaElement>(null)
  const rows = useRef<(HTMLButtonElement | null)[]>([])

  const model = MODELS.find((entry) => entry.id === modelId) ?? MODELS[0]
  const mode = MODES.find((entry) => entry.id === modeId) ?? MODES[0]
  const canSend = value.trim().length > 0
  // Typing answers the palette, so the rows step aside instead of competing
  // with the caret for the arrow keys.
  const showPalette = paletteOpen && !streaming && value.trim().length === 0

  // Edit loads the turn here; the caret lands at the end once the controlled
  // value has reached the DOM.
  useEffect(() => {
    if (!draft) return
    setValue(draft.text)
    const timer = window.setTimeout(() => {
      const node = box.current
      if (!node) return
      node.focus()
      node.setSelectionRange(node.value.length, node.value.length)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [draft])

  // A quote only means something next to the box you answer it in.
  useEffect(() => {
    if (quote) box.current?.focus()
  }, [quote])

  function send(text: string) {
    // While a reply streams the only primary action is Stop, so Enter and the
    // form must not slip a second send past it. The typed text stays put.
    if (streaming) return
    const trimmed = text.trim()
    // The send control never disables, so an empty press puts the caret back in
    // the box rather than doing nothing at all.
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

  function focusRow(index: number) {
    rows.current[index]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (showPalette && event.key === "Escape") {
      event.preventDefault()
      setPaletteOpen(false)
      return
    }
    if (showPalette && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault()
      focusRow(event.key === "ArrowDown" ? 0 : SUGGESTIONS.length - 1)
      return
    }
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

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      focusRow((index + 1) % SUGGESTIONS.length)
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (index === 0) box.current?.focus()
      else focusRow(index - 1)
      return
    }
    if (event.key === "Escape") {
      event.preventDefault()
      setPaletteOpen(false)
      box.current?.focus()
      return
    }
    // Explicit, and preventDefault suppresses the button's own Enter click, so
    // the hint row's promise holds without sending the row twice.
    if (event.key === "Enter") {
      event.preventDefault()
      send(SUGGESTIONS[index])
    }
  }

  const free = SOURCES.filter(
    (source) => !attachments.some((item) => item.id === source.id)
  )

  return (
    <>
      {showPalette ? (
        <Card
          size="sm"
          role="group"
          aria-label="Suggested prompts"
          className="gap-1 p-1.5"
        >
          <div className="text-muted-foreground flex items-center gap-1.5 px-1.5 pt-0.5 pb-1 text-[11px]">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
            <Kbd className="ms-1.5">Enter</Kbd>
            select
            <Kbd className="ms-auto">Esc</Kbd>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Close suggestions"
                    onClick={() => {
                      setPaletteOpen(false)
                      box.current?.focus()
                    }}
                    className="text-muted-foreground hover:text-foreground -me-0.5"
                  />
                }
              >
                {ICON_CLOSE}
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </div>
          {SUGGESTIONS.map((prompt, index) => (
            <button
              key={prompt}
              type="button"
              ref={(node) => {
                rows.current[index] = node
              }}
              onKeyDown={(event) => handleRowKeyDown(event, index)}
              onClick={() => send(prompt)}
              className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:ring-ring flex w-full items-center gap-2 rounded-full px-2 py-1.5 text-start text-xs outline-none focus-visible:ring-2"
            >
              {ICON_ROW}
              <span className="min-w-0 flex-1 truncate">{prompt}</span>
            </button>
          ))}
        </Card>
      ) : null}

      <form onSubmit={submit} className="w-full">
        <Field>
          <FieldLabel className="sr-only" htmlFor={COMPOSER_ID}>
            Message {ASSISTANT_NAME}
          </FieldLabel>

          <InputGroup>
            {/* Scope rides above the text, where an editor copilot puts it, so
                the reader sees what the answer is bounded to before typing. */}
            {quote || attachments.length ? (
              <InputGroupAddon
                align="block-start"
                className="flex-col items-stretch gap-1.5"
              >
                {quote ? (
                  <Attachment size="xs" className="w-full gap-2">
                    <span className="text-muted-foreground">{ICON_QUOTE}</span>
                    <AttachmentContent>
                      <AttachmentTitle className="text-muted-foreground italic">
                        {quote}
                      </AttachmentTitle>
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction
                        type="button"
                        aria-label="Remove the quoted sentence"
                        onClick={() => onQuoteChange(null)}
                      >
                        {ICON_CLOSE}
                      </AttachmentAction>
                    </AttachmentActions>
                  </Attachment>
                ) : null}
                {attachments.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {attachments.map((source) => (
                      <Attachment
                        key={source.id}
                        size="xs"
                        className="max-w-56 gap-2"
                      >
                        <span className="text-muted-foreground">
                          {ICON_FILE}
                        </span>
                        <AttachmentContent>
                          <AttachmentTitle>{source.title}</AttachmentTitle>
                        </AttachmentContent>
                        <AttachmentActions>
                          <AttachmentAction
                            type="button"
                            aria-label={`Remove ${source.title}`}
                            onClick={() => onDetach(source.id)}
                          >
                            {ICON_CLOSE}
                          </AttachmentAction>
                        </AttachmentActions>
                      </Attachment>
                    ))}
                  </div>
                ) : null}
              </InputGroupAddon>
            ) : null}

            <InputGroupTextarea
              id={COMPOSER_ID}
              ref={box}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={COMPOSER_PLACEHOLDER}
              // Starts one line and grows with the text, capped so the
              // transcript never loses the panel.
              className="field-sizing-content max-h-32 min-h-10"
            />

            <InputGroupAddon
              align="block-end"
              className="justify-between gap-2"
            >
              <div className="flex min-w-0 items-center gap-1">
                <DropdownMenu>
                  {/* The span is load bearing: rendering the menu trigger as
                      the tooltip trigger merges away its open behaviour. */}
                  <Tooltip>
                    <TooltipTrigger render={<span className="flex" />}>
                      <DropdownMenuTrigger
                        render={
                          <InputGroupButton
                            size="icon-sm"
                            aria-label="Attach a recording"
                            disabled={free.length === 0}
                          />
                        }
                      >
                        {ICON_ADD}
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Attach</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Attach</DropdownMenuLabel>
                      {free.map((source) => (
                        <DropdownMenuItem
                          key={source.id}
                          onClick={() => onAttach(source)}
                        >
                          {ICON_FILE}
                          <span className="min-w-0 flex-1 truncate">
                            {source.title}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Model and mode are two settings, so this is a menu with two
                    radio groups rather than one Select pretending to hold both. */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <InputGroupButton
                        size="sm"
                        aria-label={`Model ${model.name}, mode ${mode.name}`}
                        className="text-muted-foreground hover:text-foreground min-w-0 shrink gap-1.5 px-1.5"
                      />
                    }
                  >
                    <span className="min-w-0 truncate text-xs">
                      {model.name}
                    </span>
                    <span
                      aria-hidden="true"
                      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
                    />
                    <span className="shrink-0 text-xs">{mode.name}</span>
                    {ICON_CHEVRON}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuRadioGroup
                      value={modelId}
                      onValueChange={onModelChange}
                    >
                      <DropdownMenuLabel>Model</DropdownMenuLabel>
                      {MODELS.map((entry) => (
                        <DropdownMenuRadioItem key={entry.id} value={entry.id}>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm/5">
                              {entry.name}
                            </span>
                            <span className="text-muted-foreground truncate text-[11px]/4">
                              {entry.provider}
                              <span
                                aria-hidden="true"
                                className="bg-muted-foreground/40 mx-1.5 inline-block size-1 rounded-full align-middle"
                              />
                              <span className="tabular-nums">
                                {entry.context}
                              </span>{" "}
                              context
                            </span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={modeId}
                      onValueChange={onModeChange}
                    >
                      <DropdownMenuLabel>Mode</DropdownMenuLabel>
                      {MODES.map((entry) => (
                        <DropdownMenuRadioItem key={entry.id} value={entry.id}>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm/5">
                              {entry.name}
                            </span>
                            <span className="text-muted-foreground truncate text-[11px]/4">
                              {entry.detail}
                            </span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <InputGroupButton
                        size="icon-sm"
                        aria-label="Suggested prompts"
                        aria-pressed={paletteOpen}
                        onClick={() => {
                          setPaletteOpen(!paletteOpen)
                          if (!paletteOpen) box.current?.focus()
                        }}
                        className={
                          paletteOpen ? "text-primary" : "text-muted-foreground"
                        }
                      />
                    }
                  >
                    {ICON_SPARK}
                  </TooltipTrigger>
                  <TooltipContent>Suggested prompts</TooltipContent>
                </Tooltip>
              </div>

              {/* Stop replaces Send while a reply streams, so one slot always
                  holds the primary action. */}
              {streaming ? (
                <InputGroupButton size="sm" variant="outline" onClick={onStop}>
                  Stop
                </InputGroupButton>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <InputGroupButton
                        type="submit"
                        size="icon-sm"
                        variant="default"
                        aria-label="Send message"
                        aria-disabled={!canSend}
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

      <p className="text-muted-foreground text-center text-[11px]">
        {webSearch
          ? `${ASSISTANT_NAME} can browse the web. Check important info.`
          : `${ASSISTANT_NAME} answers from your workspace only.`}
      </p>
    </>
  )
}