/**
 * Composer — ReUI block ai-chat-1's docked composer, adapted.
 *
 * Kept: the dense Frame, the collapsible usage header, the auto-growing
 * InputGroup textarea, Enter-to-send, one primary slot that swaps Send ↔ Stop.
 * Stripped: attach menu, Think / Search toggles and dictation — the block's
 * demo had nothing behind them, and core-guardian chat has no tools to toggle.
 */
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { ActivityIcon, ArrowUpIcon, ChevronDownIcon, XIcon } from "lucide-react"

import { Frame, FrameHeader, FramePanel } from "@/components/reui/frame"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** What core-guardian reported for this chat so far. */
export type ChatUsage = {
  replies: number
  costUsd: number
  /** "provider · model" of the most recent reply, as routed. */
  lastRoute: string | null
}

const usd = (v: number) =>
  v === 0 ? "$0.00" : v < 0.01 ? "<$0.01" : v.toLocaleString("en-US", { style: "currency", currency: "USD" })

export function Composer({
  streaming,
  usage,
  onSend,
  onStop,
}: {
  streaming: boolean
  usage: ChatUsage
  onSend: (text: string) => void
  onStop: () => void
}) {
  const [value, setValue] = useState("")
  const [noticeOpen, setNoticeOpen] = useState(true)
  const field = useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim().length > 0 && !streaming

  function send() {
    if (!canSend) return
    const text = value.trim()
    setValue("")
    onSend(text)
    field.current?.focus()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter breaks the line; an IME commit must not post.
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    send()
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
      <Frame dense spacing="sm" className="w-full">
        {noticeOpen ? (
          <FrameHeader className="bg-muted/40 rounded-t-[calc(var(--frame-radius)-1px)]">
            <Collapsible>
              <div className="flex items-center gap-2">
                <CollapsibleTrigger
                  render={
                    <button
                      type="button"
                      className="group/notice text-muted-foreground hover:text-foreground flex min-w-0 flex-1 items-center gap-1.5 text-start text-xs"
                    />
                  }
                >
                  <ActivityIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Routed by core-guardian
                    <span aria-hidden="true" className="bg-muted-foreground/40 mx-1.5 inline-block size-1 rounded-full align-middle" />
                    <span className="tabular-nums">{usd(usage.costUsd)}</span> this chat
                  </span>
                  <ChevronDownIcon
                    className="size-3.5 shrink-0 transition-transform group-data-[panel-open]/notice:rotate-180"
                    aria-hidden="true"
                  />
                </CollapsibleTrigger>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Hide usage"
                  onClick={() => setNoticeOpen(false)}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
              <CollapsibleContent>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 pt-2.5 text-xs">
                  <span className="tabular-nums">
                    {usage.replies.toLocaleString("en-US")} {usage.replies === 1 ? "reply" : "replies"}
                  </span>
                  <span>Last route: {usage.lastRoute ?? "—"}</span>
                  <span>Model is picked per message by the router, inside the project budget.</span>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </FrameHeader>
        ) : null}

        <FramePanel className="p-0">
          <form onSubmit={submit} className="relative">
            <FieldLabel className="sr-only" htmlFor="ai-chat-composer">
              Message the assistant
            </FieldLabel>
            <InputGroup className="border-0 bg-transparent shadow-none">
              <InputGroupTextarea
                id="ai-chat-composer"
                ref={field}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                maxLength={8000}
                className="field-sizing-content max-h-48 min-h-16"
              />
              <InputGroupAddon align="block-end" className="gap-1">
                <div className="ms-auto flex items-center gap-1">
                  {streaming ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <InputGroupButton size="icon-sm" variant="outline" onClick={onStop} aria-label="Stop waiting" />
                        }
                      >
                        <span aria-hidden="true" className="bg-foreground size-2.5 rounded-xs" />
                      </TooltipTrigger>
                      <TooltipContent>Stop waiting</TooltipContent>
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
                            disabled={!canSend}
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
                  )}
                </div>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </FramePanel>
      </Frame>
      <p className="text-muted-foreground text-center text-xs">AI replies can be wrong. Check anything important.</p>
    </div>
  )
}
