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
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  COMPOSER_PLACEHOLDER,
  formatClock,
  formatTime,
  MODELS,
  MODES,
  type EventRecord,
} from "./data"
import { MicIcon, ArrowUpIcon, ChevronDownIcon, KeyRoundIcon, PaperclipIcon, CalendarIcon, XIcon } from "lucide-react"

const COMPOSER_ID = "ai-chat-8-composer"

/** One transport tick, matching the clock the recorder shows. */
const TICK_MS = 1000

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_MIC = (
  <MicIcon className="size-4" aria-hidden="true" />
)

const ICON_SEND = (
  <ArrowUpIcon className="size-4" aria-hidden="true" />
)

const ICON_CHEVRON = (
  <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
)

const ICON_SHORTCUTS = (
  <KeyRoundIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_ATTACH = (
  <PaperclipIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_EVENT = (
  <CalendarIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_CLOSE = (
  <XIcon aria-hidden="true" />
)

const MUTED_BAR_BUTTON =
  "text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 font-normal"

/** Every shortcut the panel actually binds, and nothing it does not. */
const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Enter"], label: "Send" },
  { keys: ["Shift", "Enter"], label: "New line" },
  { keys: ["Esc"], label: "Cancel recording" },
]

/**
 * One box for both modes. Recording swaps what is inside it, never the box
 * itself, so the composer holds its height instead of jumping.
 */
export function Composer({
  streaming,
  modelId,
  onModelChange,
  modeId,
  onModeChange,
  schedule,
  onAttachEvent,
  draft,
  attached,
  onDetach,
  onSend,
  onVoice,
  onStop,
}: {
  streaming: boolean
  modelId: string
  onModelChange: (id: string) => void
  modeId: string
  onModeChange: (id: string) => void
  /** The day's entries, so Attach can hand one to the next question. */
  schedule: EventRecord[]
  onAttachEvent: (id: string) => void
  /** Edit sends a transcript back here; the serial re-loads identical text. */
  draft: { text: string; serial: number } | null
  /** Meetings the panel handed down, so a named answer scopes the next ask. */
  attached: EventRecord[]
  onDetach: (id: string) => void
  onSend: (text: string) => void
  onVoice: (seconds: number) => void
  onStop: () => void
}) {
  const [value, setValue] = useState("")
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const box = useRef<HTMLTextAreaElement>(null)

  const model = MODELS.find((entry) => entry.id === modelId) ?? MODELS[0]
  const mode = MODES.find((entry) => entry.id === modeId) ?? MODES[0]
  const canSend = value.trim().length > 0
  const free = schedule.filter(
    (event) =>
      !event.movedTo && !attached.some((entry) => entry.id === event.id)
  )

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

  // The take's clock, owned here so Cancel and Stop can read it without a
  // second component holding the same number.
  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(
      () => setSeconds((current) => current + 1),
      TICK_MS
    )
    return () => window.clearInterval(timer)
  }, [recording])

  // Esc drops the take, the way it drops any other transient mode.
  useEffect(() => {
    if (!recording) return
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setRecording(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [recording])

  function startRecording() {
    setSeconds(0)
    setRecording(true)
  }

  function send(text: string) {
    // While a reply streams the only primary action is Stop, so Enter and the
    // form must not slip a second send past it. The typed text stays put.
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
    <div className="flex flex-col gap-2">
      {attached.length ? (
        <div className="flex flex-wrap gap-1.5">
          {attached.map((event) => (
            <Attachment key={event.id} size="sm" className="max-w-56 gap-2">
              <span className="text-muted-foreground">{ICON_EVENT}</span>
              <AttachmentContent>
                <AttachmentTitle>{event.title}</AttachmentTitle>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  type="button"
                  aria-label={`Remove ${event.title}`}
                  onClick={() => onDetach(event.id)}
                >
                  {ICON_CLOSE}
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </div>
      ) : null}

      <form onSubmit={submit}>
        <Field>
          <FieldLabel htmlFor={COMPOSER_ID} className="sr-only">
            Message the assistant
          </FieldLabel>
          {/* min-h-10 is the resting height of the textarea row, so the
              recording row lands on exactly the same box. */}
          <InputGroup className="min-h-10">
            {recording ? (
              <div
                role="status"
                className="flex min-w-0 flex-1 items-center gap-2.5 ps-3"
              >
                <span
                  aria-hidden="true"
                  className="bg-destructive size-2 shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
                />
                <span className="text-sm font-medium">Recording</span>
                {/* role=status would announce the clock every tick. */}
                <span
                  aria-hidden="true"
                  className="text-muted-foreground text-sm tabular-nums"
                >
                  {formatClock(seconds)}
                </span>
              </div>
            ) : (
              <InputGroupTextarea
                id={COMPOSER_ID}
                ref={box}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={COMPOSER_PLACEHOLDER}
                // Starts one line and grows with the text, capped so the
                // transcript never loses the panel.
                className="field-sizing-content max-h-32 min-h-9"
              />
            )}

            <InputGroupAddon align="inline-end" className="self-end pb-1">
              {recording ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecording(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setRecording(false)
                      onVoice(seconds)
                    }}
                  >
                    Stop
                  </Button>
                </div>
              ) : streaming ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onStop}
                >
                  Stop
                </Button>
              ) : canSend ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="submit"
                        size="icon-sm"
                        aria-label="Send message"
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
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Record a voice note"
                        onClick={startRecording}
                        className="text-muted-foreground hover:text-foreground rounded-full"
                      />
                    }
                  >
                    {ICON_MIC}
                  </TooltipTrigger>
                  <TooltipContent>Speak</TooltipContent>
                </Tooltip>
              )}
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </form>

      {/* Both clusters sit on the input box's own edges, so the bar reads as
          part of the composer rather than floating under it. */}
      <div className="flex items-center justify-between gap-2 px-1">
        {/* Model and mode are two settings, so this is a menu with two radio
            groups rather than one Select pretending to hold both. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Model ${model.name}, mode ${mode.name}`}
                className="text-muted-foreground hover:text-foreground h-7 min-w-0 shrink gap-1.5 px-2 font-normal"
              />
            }
          >
            <span className="min-w-0 truncate text-xs">{model.name}</span>
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
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate">{entry.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {entry.detail}
                    </span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={modeId} onValueChange={onModeChange}>
              <DropdownMenuLabel>Mode</DropdownMenuLabel>
              {MODES.map((entry) => (
                <DropdownMenuRadioItem key={entry.id} value={entry.id}>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate">{entry.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {entry.detail}
                    </span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex shrink-0 items-center gap-0.5">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Keyboard shortcuts"
                  className={MUTED_BAR_BUTTON}
                />
              }
            >
              {ICON_SHORTCUTS}
              <span className="text-xs max-sm:sr-only">Shortcuts</span>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <div className="flex flex-col gap-2">
                {SHORTCUTS.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm">{shortcut.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Attach a meeting"
                  disabled={free.length === 0}
                  className={MUTED_BAR_BUTTON}
                />
              }
            >
              {ICON_ATTACH}
              <span className="text-xs max-sm:sr-only">Attach</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Attach a meeting</DropdownMenuLabel>
                {free.map((event) => (
                  <DropdownMenuItem
                    key={event.id}
                    onClick={() => onAttachEvent(event.id)}
                  >
                    {ICON_EVENT}
                    <span className="min-w-0 flex-1 truncate">
                      {event.title}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {formatTime(event.startsAt)}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}