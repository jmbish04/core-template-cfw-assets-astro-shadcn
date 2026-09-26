import { type FormEvent, type KeyboardEvent, type RefObject } from "react"
import {
  Frame,
  FrameFooter,
  FramePanel,
} from "@/components/reui/frame"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentGroup,
  AttachmentTitle,
} from "@/components/ui/attachment"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ASSISTANT_NAME,
  COMPOSER_FILES,
  MODELS,
  type AppId,
  type AttachmentRecord,
  type ModeRecord,
} from "./data"
import { Integrations } from "./integrations"
import { XIcon, PaperclipIcon, ArrowUpIcon } from "lucide-react"

const COMPOSER_ID = "ai-chat-5-composer"

/**
 * The chat box. A Frame carries two jobs at once: the panel is what you type
 * into, and the footer is the scope that typing will be answered from.
 */
export function Composer({
  value,
  files,
  mode,
  modelId,
  connected,
  fieldRef,
  onValueChange,
  onFilesChange,
  onModelChange,
  onToggleApp,
  onSend,
}: {
  value: string
  files: AttachmentRecord[]
  /** Sets the placeholder the empty box shows. */
  mode: ModeRecord
  modelId: string
  connected: AppId[]
  fieldRef: RefObject<HTMLTextAreaElement | null>
  onValueChange: (text: string) => void
  onFilesChange: (files: AttachmentRecord[]) => void
  onModelChange: (id: string) => void
  onToggleApp: (id: AppId, next: boolean) => void
  onSend: (text: string, files: AttachmentRecord[]) => void
}) {
  const canSend = value.trim().length > 0 || files.length > 0

  function send() {
    // The send control never disables, so a press on an empty box puts the
    // caret back rather than doing nothing at all.
    if (!canSend) {
      fieldRef.current?.focus()
      return
    }
    onSend(value.trim(), files)
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
    <form onSubmit={submit}>
      <FieldLabel className="sr-only" htmlFor={COMPOSER_ID}>
        Message {ASSISTANT_NAME}
      </FieldLabel>

      <Frame spacing="sm">
        {/* The panel paints the card, so the group inside it drops its own
            surface and keeps only the focus ring. */}
        <FramePanel fit className="p-0">
          <InputGroup className="rounded-(--frame-panel-radius) border-0 bg-transparent">
            {files.length ? (
              <AttachmentGroup
                aria-label="Staged files"
                // The group centers its chips otherwise: the column layout the
                // block-end addon switches on inherits items-center.
                className="w-full gap-2 px-3 pt-3"
              >
                {files.map((file) => (
                  <Attachment key={file.id} size="xs" className="max-w-56">
                    <AttachmentContent>
                      <AttachmentTitle>{file.name}</AttachmentTitle>
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          onFilesChange(
                            files.filter((item) => item.id !== file.id)
                          )
                        }
                      >
                        <XIcon aria-hidden="true" />
                      </AttachmentAction>
                    </AttachmentActions>
                  </Attachment>
                ))}
              </AttachmentGroup>
            ) : null}

            <InputGroupTextarea
              id={COMPOSER_ID}
              ref={fieldRef}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode.prompt}
              // Starts near two lines and grows, capped so the strip below it
              // never leaves the screen on a laptop.
              className="field-sizing-content max-h-40 min-h-16"
            />

            <InputGroupAddon align="block-end" className="gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <InputGroupButton
                      size="icon-sm"
                      className="rounded-full"
                      aria-label="Attach a file"
                    />
                  }
                >
                  <PaperclipIcon aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Attach a file</DropdownMenuLabel>
                    {COMPOSER_FILES.map((file) => (
                      <DropdownMenuItem
                        key={file.id}
                        // Staging the same file twice would send it twice.
                        disabled={files.some((item) => item.id === file.id)}
                        onClick={() =>
                          onFilesChange(
                            files.some((item) => item.id === file.id)
                              ? files
                              : [...files, file]
                          )
                        }
                        className="items-start gap-2 py-1.5"
                      >
                        <span className="flex flex-1 flex-col">
                          <span>{file.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {file.meta}
                          </span>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="ms-auto flex items-center gap-1">
                <Select
                  value={modelId}
                  onValueChange={(next) => next && onModelChange(next)}
                  items={MODELS.map((model) => ({
                    value: model.id,
                    label: model.name,
                  }))}
                >
                  <SelectTrigger
                    size="sm"
                    aria-label="Answer depth"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent h-7 w-auto min-w-0 gap-1 border-transparent px-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
                  >
                    <SelectValue className="truncate text-xs" />
                  </SelectTrigger>
                  {/* End anchored and pinned off the selected item: the trigger
                      closes the row, so the popup has to grow inward. */}
                  <SelectContent
                    align="end"
                    alignItemWithTrigger={false}
                    className="min-w-64!"
                  >
                    <SelectGroup>
                      <SelectLabel>Answer depth</SelectLabel>
                      {MODELS.map((model) => (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          className="items-start py-1.5"
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm/5 font-medium">
                              {model.name}
                            </span>
                            <span className="text-muted-foreground truncate text-[11px]/4">
                              {model.detail}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

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
                    <ArrowUpIcon aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-1.5">
                    Send
                    <Kbd>Enter</Kbd>
                  </TooltipContent>
                </Tooltip>
              </div>
            </InputGroupAddon>
          </InputGroup>
        </FramePanel>

        <FrameFooter>
          <Integrations connected={connected} onToggle={onToggleApp} />
        </FrameFooter>
      </Frame>
    </form>
  )
}