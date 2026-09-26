import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react"

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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  PICKABLE_FILES,
  SOURCES,
  type FileKind,
  type FileRecord,
  type SourceRecord,
} from "./data"
import { LayersIcon, PaperclipIcon, FileTextIcon, BarChart3Icon, ImageIcon, XIcon, ChevronDownIcon, ArrowUpIcon } from "lucide-react"

const COMPOSER_ID = "ai-chat-6-composer"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_CONTEXT = (
  <LayersIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_ATTACH = (
  <PaperclipIcon aria-hidden="true" />
)

const ICON_FILE_DOC = (
  <FileTextIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_FILE_DATA = (
  <BarChart3Icon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_FILE_IMAGE = (
  <ImageIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

/** The record carries the kind; the nodes live here because IconPlaceholder
    needs static names. */
const FILE_ICON: Record<FileKind, ReactNode> = {
  doc: ICON_FILE_DOC,
  data: ICON_FILE_DATA,
  image: ICON_FILE_IMAGE,
}

const ICON_CLOSE = (
  <XIcon aria-hidden="true" />
)

const ICON_CHEVRON = (
  <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
)

const ICON_SEND = (
  <ArrowUpIcon aria-hidden="true" />
)

function sourceLine(source: SourceRecord) {
  return source.attached ? `Attached, ${source.meta}` : source.meta
}

export function Composer({
  streaming,
  contextIds,
  onSourceToggle,
  /** True once a run or a ticket depends on the set, so a toggle costs work. */
  contextCostsWork,
  files,
  onFileAdd,
  onFileRemove,
  starters,
  draft,
  onSend,
  onStop,
}: {
  streaming: boolean
  contextIds: string[]
  onSourceToggle: (id: string, on: boolean) => void
  contextCostsWork: boolean
  files: FileRecord[]
  onFileAdd: (file: FileRecord) => void
  onFileRemove: (id: string) => void
  /** Offered under an empty box on a fresh chat, gone once anything is typed. */
  starters: string[]
  /** Text Edit sends back down; the serial re-loads an identical text. */
  draft: { text: string; serial: number } | null
  onSend: (text: string) => void
  onStop: () => void
}) {
  const [value, setValue] = useState("")
  const box = useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim().length > 0
  const showStarters = starters.length > 0 && !streaming && !canSend
  const free = PICKABLE_FILES.filter(
    (file) => !files.some((staged) => staged.id === file.id)
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
    <>
      {showStarters ? (
        <div
          role="group"
          aria-label="Suggested prompts"
          className="flex flex-col gap-1.5"
        >
          {starters.map((prompt) => (
            <Button
              key={prompt}
              type="button"
              variant="outline"
              onClick={() => send(prompt)}
              className="text-muted-foreground hover:text-foreground h-auto justify-start py-1.5 font-normal"
            >
              <span className="min-w-0 truncate">{prompt}</span>
            </Button>
          ))}
        </div>
      ) : null}

      <form onSubmit={submit} className="w-full">
        <Field>
          <FieldLabel className="sr-only" htmlFor={COMPOSER_ID}>
            Message {ASSISTANT_NAME}
          </FieldLabel>

          <InputGroup>
            {/* Staged files ride above the text, where an editor copilot puts
                them, so the scope of the ask is set before it is typed. */}
            {files.length ? (
              <InputGroupAddon
                align="block-start"
                className="flex-col items-stretch"
              >
                <AttachmentGroup aria-label="Staged files" className="gap-2">
                  {files.map((file) => (
                    <Attachment key={file.id} size="xs" className="max-w-56">
                      <AttachmentMedia className="text-muted-foreground">
                        {FILE_ICON[file.kind]}
                      </AttachmentMedia>
                      <AttachmentContent>
                        <AttachmentTitle>{file.name}</AttachmentTitle>
                        <AttachmentDescription className="tabular-nums">
                          {file.meta}
                        </AttachmentDescription>
                      </AttachmentContent>
                      <AttachmentActions>
                        <AttachmentAction
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => onFileRemove(file.id)}
                        >
                          {ICON_CLOSE}
                        </AttachmentAction>
                      </AttachmentActions>
                    </Attachment>
                  ))}
                </AttachmentGroup>
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
                            aria-label="Attach a file"
                            disabled={free.length === 0}
                          />
                        }
                      >
                        {ICON_ATTACH}
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Attach</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Attach</DropdownMenuLabel>
                      {free.map((file) => (
                        <DropdownMenuItem
                          key={file.id}
                          onClick={() => onFileAdd(file)}
                        >
                          {FILE_ICON[file.kind]}
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm/5">
                              {file.name}
                            </span>
                            <span className="text-muted-foreground truncate text-xs tabular-nums">
                              {file.meta}
                            </span>
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <InputGroupButton
                        size="sm"
                        aria-label={`Context, ${contextIds.length} of ${SOURCES.length} sources`}
                        className="text-muted-foreground hover:text-foreground min-w-0 shrink gap-1.5 px-1.5"
                      />
                    }
                  >
                    {ICON_CONTEXT}
                    <span className="truncate text-xs tabular-nums">
                      {contextIds.length}
                    </span>
                    {ICON_CHEVRON}
                  </DropdownMenuTrigger>
                  {/* Base UI throws on a label outside a group, and its checkbox
                      items already default to staying open on click. */}
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="flex flex-col items-start gap-0.5">
                        Context
                        {/* The one place this is said before it happens: the
                            toggle below throws away the run in the thread. */}
                        <span className="text-muted-foreground text-xs font-normal">
                          {contextCostsWork
                            ? "Changing this restarts from the question"
                            : "What the next answer may read"}
                        </span>
                      </DropdownMenuLabel>
                      {SOURCES.map((source) => (
                        <DropdownMenuCheckboxItem
                          key={source.id}
                          checked={contextIds.includes(source.id)}
                          onCheckedChange={(checked) =>
                            onSourceToggle(source.id, checked)
                          }
                          closeOnClick={false}
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm/5">
                              {source.title}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                              {sourceLine(source)}
                            </span>
                          </span>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Stop replaces Send while a reply streams, so one slot always
                  holds the primary action. */}
              {streaming ? (
                <InputGroupButton
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={onStop}
                >
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
    </>
  )
}