"use client"

import { useEffect, useRef, useState } from "react"
import type { FormEvent, KeyboardEvent, RefObject } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { ContextChips } from "./context-chips"
import {
  ASSISTANT_NAME,
  CONTEXT_SOURCES,
  EFFORTS,
  PLACEHOLDER_PROMPTS,
} from "./data"
import { PlusIcon, BrainIcon, ChevronDownIcon, ArrowUpIcon } from "lucide-react"

/** How long each example holds before the next one rises in. */
const PROMPT_MS = 2600

/** The outgoing line leaves upward and the rest wait below, so a rotation never
    reverses direction; `fade` drops the offsets for swaps that are not one. */
function slotPosition(index: number, active: number, fade: boolean) {
  if (fade) return index === active ? "current-fade" : "hidden-fade"
  if (index === active) return "current"
  const previous =
    (active - 1 + PLACEHOLDER_PROMPTS.length) % PLACEHOLDER_PROMPTS.length
  return index === previous ? "above" : "below"
}

/** Cycles the examples while the field is empty and unfocused. Reduced motion
    holds the first one, so nothing moves. */
function useRotatingPrompt(active: boolean) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % PLACEHOLDER_PROMPTS.length),
      PROMPT_MS
    )
    return () => window.clearInterval(timer)
  }, [active])

  return index
}

export function Composer({
  value,
  onValueChange,
  fieldRef,
  contextIds,
  onAddContext,
  onRemoveContext,
  effortId,
  onEffortChange,
  streaming,
  onSend,
  onStop,
}: {
  value: string
  onValueChange: (next: string) => void
  /** The starter cards fill this field, so the caret has to land in it. */
  fieldRef: RefObject<HTMLTextAreaElement | null>
  contextIds: string[]
  onAddContext: (id: string) => void
  onRemoveContext: (id: string) => void
  effortId: string
  onEffortChange: (id: string) => void
  streaming: boolean
  onSend: (text: string) => void
  onStop: () => void
}) {
  const canSend = value.trim().length > 0
  const effort = EFFORTS.find((item) => item.id === effortId) ?? EFFORTS[0]
  const [focused, setFocused] = useState(false)
  // Frozen once the caret is in the field: a label moving under a caret reads
  // as a glitch rather than a suggestion.
  const promptIndex = useRotatingPrompt(!value && !focused)
  // Focus parks the rotation on the invitation instead of a worked example.
  const activeIndex = focused ? 0 : promptIndex
  // Focus and blur are not rotations, so they cross fade in place; the flag
  // clears after the swap so the next rotation slides again.
  const [fadeSwap, setFadeSwap] = useState(false)
  const fadeTimer = useRef<number | null>(null)

  function beginFadeSwap() {
    setFadeSwap(true)
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
    fadeTimer.current = window.setTimeout(() => setFadeSwap(false), 600)
  }

  useEffect(
    () => () => {
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
    },
    []
  )

  function send() {
    // The send control never disables, so an empty press puts the caret back
    // in the field rather than doing nothing at all.
    if (!canSend) {
      fieldRef.current?.focus()
      return
    }
    onSend(value.trim())
    // The composer never locks during a reply, so the caret belongs back in it.
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <FieldLabel className="sr-only" htmlFor="ai-chat-3-composer">
          Message {ASSISTANT_NAME}
        </FieldLabel>

        {/* Chips ride ABOVE the pill, exactly like they later ride the sent
            turn: a block-start addon would flex-col the group and unround it. */}
        {contextIds.length ? (
          <ContextChips
            ids={contextIds}
            onRemove={onRemoveContext}
            className="gap-2 px-2"
          />
        ) : null}

        {/* A raised pill; h-auto restores what the group's has-[>textarea]
            selector loses once the wrapper div owns the textarea. */}
        <InputGroup className="bg-background h-auto rounded-full px-2 shadow-xs">
          {/* The wrapper scopes the placeholder overlay to the textarea row,
              keeping it centred on the field whatever sits around the pill. */}
          <div className="relative w-full min-w-0 flex-1">
            <InputGroupTextarea
              id="ai-chat-3-composer"
              ref={fieldRef}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setFocused(true)
                beginFadeSwap()
              }}
              onBlur={() => {
                setFocused(false)
                beginFadeSwap()
              }}
              // The overlay below is the only placeholder, so the two states
              // can cross fade instead of the native one popping in.
              placeholder=""
              // 12px padding around a 24px line leaves no slack, so a single
              // line sits centred; the box then grows with the text.
              className="field-sizing-content max-h-40 min-h-12 w-full px-0 py-3"
            />

            {/* The placeholder, absolute so it never joins the flex row and
                cannot push the field around as the text length changes. */}
            <span
              aria-hidden="true"
              data-empty={value ? "false" : "true"}
              data-focused={focused || undefined}
              className="group/placeholder text-muted-foreground pointer-events-none absolute inset-y-0 start-0 end-0 overflow-hidden text-sm opacity-0 transition-opacity duration-200 ease-out data-[empty=true]:opacity-100 motion-reduce:transition-none"
            >
              {/* Every line stays mounted and only its opacity and offset move,
                  so the outgoing prompt fades out as the next one rises in. */}
              {PLACEHOLDER_PROMPTS.map((line, index) => (
                <span
                  key={line}
                  data-slot-position={slotPosition(
                    index,
                    activeIndex,
                    fadeSwap
                  )}
                  className="absolute inset-y-0 start-0 end-0 flex translate-y-0 items-center truncate opacity-0 transition-[opacity,translate] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-[slot-position=above]:-translate-y-2.5 data-[slot-position=below]:translate-y-2.5 data-[slot-position=current]:opacity-100 data-[slot-position=current]:delay-150 data-[slot-position=current]:duration-300 data-[slot-position=current-fade]:opacity-100 data-[slot-position=current-fade]:delay-150 data-[slot-position=current-fade]:duration-300 motion-reduce:translate-y-0 motion-reduce:transition-none"
                >
                  {line}
                </span>
              ))}
            </span>
          </div>

          <InputGroupAddon align="inline-start" className="me-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <InputGroupButton
                    size="icon-sm"
                    className="rounded-full"
                    aria-label="Add context"
                  />
                }
              >
                <PlusIcon aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Add context</DropdownMenuLabel>
                  {CONTEXT_SOURCES.map((source) => {
                    const attached = contextIds.includes(source.id)
                    return (
                      <DropdownMenuItem
                        key={source.id}
                        disabled={attached}
                        onClick={() => onAddContext(source.id)}
                      >
                        {source.icon}
                        {source.label}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>

                {/* Effort lives here ONLY below sm, where the bar's own picker
                    is hidden: one mounted control per setting per width. */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="sm:hidden">
                    <BrainIcon aria-hidden="true" />
                    Reasoning
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    <DropdownMenuRadioGroup
                      value={effortId}
                      onValueChange={(next) => next && onEffortChange(next)}
                    >
                      {EFFORTS.map((item) => (
                        <DropdownMenuRadioItem
                          key={item.id}
                          value={item.id}
                          className="items-start gap-2 py-1.5"
                        >
                          <span className="flex flex-col">
                            <span>{item.label}</span>
                            <span className="text-muted-foreground text-xs">
                              {item.hint}
                            </span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </InputGroupAddon>

          <InputGroupAddon align="inline-end" className="gap-1">
            {/* Named on the bar because it delays the next answer; below sm
                  the plus menu's submenu takes over and this leaves the row. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <InputGroupButton
                    size="sm"
                    variant="ghost"
                    className="rounded-full max-sm:hidden"
                    aria-label={`Reasoning, ${effort.label}`}
                  />
                }
              >
                {effort.label}
                <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuRadioGroup
                  value={effortId}
                  onValueChange={(next) => next && onEffortChange(next)}
                >
                  {EFFORTS.map((item) => (
                    <DropdownMenuRadioItem
                      key={item.id}
                      value={item.id}
                      className="items-start gap-2 py-1.5"
                    >
                      <span className="flex flex-col">
                        <span>{item.label}</span>
                        <span className="text-muted-foreground text-xs">
                          {item.hint}
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Stop REPLACES send while a reply streams: one slot always holds
                  the primary action, and Enter still posts the next message. */}
            {streaming ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      size="icon-sm"
                      variant="default"
                      className="rounded-full"
                      onClick={onStop}
                      aria-label="Stop generating"
                    />
                  }
                >
                  {/* A filled square is the stop glyph everywhere, and it
                        matches the send arrow's height with no icon mapping. */}
                  <span
                    aria-hidden="true"
                    className="bg-primary-foreground size-2.5"
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
                      className="rounded-full"
                      aria-label="Send message"
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
          </InputGroupAddon>
        </InputGroup>
      </form>

      <p className="text-muted-foreground text-center text-xs">
        {ASSISTANT_NAME} can make mistakes. Check important info.
      </p>
    </div>
  )
}