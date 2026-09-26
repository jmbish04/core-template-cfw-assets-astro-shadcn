import {
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { Badge } from "@/components/reui/badge"
import { cn } from "@/lib/utils"

import { AnthropicBlack } from "@/components/ui/svgs/anthropicBlack"
import { AnthropicWhite } from "@/components/ui/svgs/anthropicWhite"
import { Gemini } from "@/components/ui/svgs/gemini"
import { MistralAiLogo } from "@/components/ui/svgs/mistralAiLogo"
import { Openai } from "@/components/ui/svgs/openai"
import { OpenaiDark } from "@/components/ui/svgs/openaiDark"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
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
import { FieldLabel } from "@/components/ui/field"
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
  ATTACH_SOURCES,
  MODEL_PROVIDERS,
  MODELS,
  SKILLS,
  SOURCES,
} from "./data"
import { SourceGlyph } from "./reply-detail"
import { SparklesIcon, PaperclipIcon, XIcon, ChevronDownIcon, ArrowUpIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_SKILLS = (
  <SparklesIcon aria-hidden="true" />
)

const ICON_ATTACH = (
  <PaperclipIcon aria-hidden="true" />
)

const ICON_REMOVE = (
  <XIcon aria-hidden="true" />
)

const ICON_CHEVRON = (
  <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
)

const ICON_SEND = (
  <ArrowUpIcon aria-hidden="true" />
)

/** Paired marks swap per theme; single marks are theme safe as shipped. The
    svg fills its wrapper, so one set serves the trigger and the menu label. */
const PROVIDER_LOGOS: Record<string, ReactNode> = {
  Anthropic: (
    <>
      <AnthropicBlack className="size-full dark:hidden" />
      <AnthropicWhite className="hidden size-full dark:block" />
    </>
  ),
  OpenAI: (
    <>
      <Openai className="size-full dark:hidden" />
      <OpenaiDark className="hidden size-full dark:block" />
    </>
  ),
  Google: <Gemini className="size-full" />,
  Mistral: <MistralAiLogo className="size-full" />,
}

function ProviderMark({
  provider,
  className,
}: {
  provider: string
  className?: string
}) {
  const logo = PROVIDER_LOGOS[provider]
  if (!logo) return null
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className
      )}
    >
      {logo}
    </span>
  )
}

export function Composer({
  streaming,
  modelId,
  onModelChange,
  onSend,
  onStop,
}: {
  streaming: boolean
  /** Also the model a Regenerate writes its next version with. */
  modelId: string
  onModelChange: (id: string) => void
  /** The ids ride along, so the turn can show what it was asked against. */
  onSend: (text: string, attachedIds?: string[]) => void
  onStop: () => void
}) {
  const [value, setValue] = useState("")
  /** Source ids riding the message being written, cleared when it sends. */
  const [attached, setAttached] = useState<string[]>([])
  const box = useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim().length > 0
  const activeModel = MODELS.find((model) => model.id === modelId) ?? MODELS[0]

  function send() {
    // While a reply streams the primary action is Stop, and a second send
    // would orphan the ask already in flight.
    if (streaming) return
    // The send control never disables, so an empty press puts the caret back
    // in the box rather than doing nothing at all.
    if (!canSend) {
      box.current?.focus()
      return
    }
    const text = value.trim()
    const riding = attached
    setValue("")
    setAttached([])
    onSend(text, riding)
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

  /** A skill fills the box rather than sending: the ask is still editable,
      which is the difference between a shortcut and a hidden command. */
  function applySkill(prompt: string) {
    setValue(prompt)
    box.current?.focus()
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-2 px-4 pt-1 pb-4 sm:px-6">
      <form onSubmit={submit}>
        <FieldLabel className="sr-only" htmlFor="ai-chat-9-composer">
          Message {ASSISTANT_NAME}
        </FieldLabel>

        <InputGroup>
          {attached.length > 0 ? (
            <InputGroupAddon align="block-start">
              {/* Scrolls rather than wraps, so a fourth attachment never
                  grows the composer a second row over the thread. */}
              <AttachmentGroup className="gap-1.5">
                {attached.map((id) => {
                  const source = SOURCES[id]
                  return (
                    <Attachment key={id} size="xs" className="max-w-52">
                      <AttachmentMedia
                        variant="icon"
                        className="text-muted-foreground"
                      >
                        <SourceGlyph kind={source.kind} />
                      </AttachmentMedia>
                      <AttachmentContent>
                        <AttachmentTitle>{source.title}</AttachmentTitle>
                      </AttachmentContent>
                      <AttachmentActions>
                        <AttachmentAction
                          aria-label={`Remove ${source.title}`}
                          onClick={() =>
                            setAttached((current) =>
                              current.filter((item) => item !== id)
                            )
                          }
                          className="[&_svg]:size-3"
                        >
                          {ICON_REMOVE}
                        </AttachmentAction>
                      </AttachmentActions>
                    </Attachment>
                  )
                })}
              </AttachmentGroup>
            </InputGroupAddon>
          ) : null}

          <InputGroupTextarea
            id="ai-chat-9-composer"
            ref={box}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply to this thread..."
            // Starts one line and grows with the text, capped so a long draft
            // never pushes the transcript off screen.
            className="field-sizing-content max-h-40 min-h-10"
          />

          <InputGroupAddon align="block-end" className="gap-1">
            {/* Skills fill the box with an ask the thread can actually
                answer, so the menu is a shortcut and not a mode switch. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<InputGroupButton size="icon-sm" aria-label="Skills" />}
              >
                {ICON_SKILLS}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Skills</DropdownMenuLabel>
                  {SKILLS.map((skill) => (
                    <DropdownMenuItem
                      key={skill.id}
                      onClick={() => applySkill(skill.prompt)}
                    >
                      {skill.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <InputGroupButton size="icon-sm" aria-label="Attach source" />
                }
              >
                {ICON_ATTACH}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Attach</DropdownMenuLabel>
                  {ATTACH_SOURCES.map((entry) => {
                    const source = SOURCES[entry.sourceId]
                    return (
                      <DropdownMenuItem
                        key={entry.id}
                        onClick={() =>
                          setAttached((current) =>
                            current.includes(entry.sourceId)
                              ? current
                              : [...current, entry.sourceId]
                          )
                        }
                        className="gap-2.5"
                      >
                        <SourceGlyph kind={source.kind} />
                        <span className="min-w-0 truncate">{entry.label}</span>
                        <span className="text-muted-foreground ms-auto min-w-0 truncate font-mono text-xs">
                          {source.title}
                        </span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* This picker also decides which model the next Regenerate uses,
                so switching it changes what the version arrows navigate. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <InputGroupButton
                    size="sm"
                    className="min-w-0 font-normal"
                    aria-label={`Model, ${activeModel.name}`}
                  />
                }
              >
                <ProviderMark
                  provider={activeModel.provider}
                  className="size-4"
                />
                <span className="truncate">{activeModel.name}</span>
                {ICON_CHEVRON}
              </DropdownMenuTrigger>
              {/* One row per model: a separate "best" section would put the
                  default in two groups and draw two checkmarks. */}
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuRadioGroup
                  value={modelId}
                  onValueChange={(next) => next && onModelChange(next)}
                >
                  {MODEL_PROVIDERS.map((group, index) => (
                    <DropdownMenuGroup key={group.provider}>
                      {index > 0 ? <DropdownMenuSeparator /> : null}
                      <DropdownMenuLabel className="text-muted-foreground flex items-center gap-1.5 text-xs font-normal">
                        <ProviderMark
                          provider={group.provider}
                          className="size-3.5"
                        />
                        {group.provider}
                      </DropdownMenuLabel>
                      {group.models.map((model) => (
                        <DropdownMenuRadioItem
                          key={model.id}
                          value={model.id}
                          closeOnClick
                          className="gap-2"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {model.name}
                          </span>
                          {model.recommended ? (
                            <Badge variant="primary-light" size="sm">
                              Default
                            </Badge>
                          ) : null}
                          <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                            {model.context}
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuGroup>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Stop replaces send while a reply streams, so one slot always
                holds the primary action. */}
            <div className="ms-auto flex items-center gap-1">
              {streaming ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <InputGroupButton
                        size="icon-sm"
                        variant="outline"
                        aria-label="Stop generating"
                        onClick={onStop}
                      />
                    }
                  >
                    {/* A filled square is the stop glyph everywhere, and it
                        matches the send arrow's height with no icon mapping. */}
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
                      />
                    }
                  >
                    {ICON_SEND}
                    <span className="sr-only">Send</span>
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

      <p className="text-muted-foreground text-center text-[13px]">
        {ASSISTANT_NAME} can make mistakes. Check important info.
      </p>
    </div>
  )
}