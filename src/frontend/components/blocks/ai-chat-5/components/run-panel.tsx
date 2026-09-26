"use client"

import { useEffect, useState } from "react"
import { Frame, FramePanel } from "@/components/reui/frame"

import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { APPS, type AppId, type ModeRecord } from "./data"
import { TriangleAlertIcon, CheckIcon, PlusIcon } from "lucide-react"

/** How long one source takes to read before the next step starts. */
const STEP_MS = 700

export type StepState = "reading" | "read" | "skipped"

/** Reveals the answer a few characters at a time, caret riding the tail. */
function useStreamedText(text: string, active: boolean) {
  const [count, setCount] = useState(active ? 0 : text.length)

  useEffect(() => {
    if (!active) {
      setCount(text.length)
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(text.length)
      return
    }
    setCount(0)
    const step = Math.max(2, Math.round(text.length / 60))
    const timer = window.setInterval(() => {
      setCount((current) => {
        const next = Math.min(text.length, current + step)
        if (next === text.length) window.clearInterval(timer)
        return next
      })
    }, 24)
    return () => window.clearInterval(timer)
  }, [text, active])

  return text.slice(0, count)
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "reading") return <Spinner className="size-4" />
  if (state === "skipped")
    return (
      <TriangleAlertIcon className="text-warning size-4" aria-hidden="true" />
    )
  return (
    <CheckIcon className="text-success size-4" aria-hidden="true" />
  )
}

/**
 * What the run actually read, one line per source. A step the scope did not
 * cover says so and offers the switch, so the strip above is never decoration.
 */
export function RunPanel({
  prompt,
  mode,
  connected,
  onConnect,
  onReset,
}: {
  prompt: string
  mode: ModeRecord
  /** Live: connecting a skipped source mid run puts its step back in the queue. */
  connected: AppId[]
  onConnect: (id: AppId) => void
  onReset: () => void
}) {
  const steps = mode.steps.flatMap((step) => {
    const app = APPS.find((record) => record.id === step.app)
    return app
      ? [{ ...step, app, reachable: connected.includes(step.app) }]
      : []
  })
  const reachable = steps.filter((step) => step.reachable).length
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (done >= reachable) return
    const timer = window.setTimeout(() => setDone((n) => n + 1), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [done, reachable])

  const settled = done >= reachable
  const streamed = useStreamedText(mode.answer, settled)

  // Reading order, not source order: a skipped source has nothing to wait for,
  // so it settles immediately and the reachable ones queue behind each other.
  let readIndex = 0
  const rows = steps.map((step) => {
    if (!step.reachable) return { ...step, state: "skipped" as StepState }
    const state: StepState = readIndex < done ? "read" : "reading"
    readIndex += 1
    return { ...step, state }
  })

  return (
    <div className="pb-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm font-medium text-pretty">
          {prompt}
        </p>
        <Button variant="ghost" size="sm" onClick={onReset} className="-me-2">
          <PlusIcon aria-hidden="true" />
          New
        </Button>
      </div>

      <Frame spacing="sm">
        <FramePanel fit className="flex flex-col py-1.5">
          <p
            aria-live="polite"
            className="text-muted-foreground px-2 pt-0.5 pb-1 text-xs"
          >
            {settled
              ? `Answered from ${reachable} of ${steps.length} sources`
              : "Reading your apps"}
          </p>

          {rows.map((row) => (
            <Item key={row.app.id} size="xs" className="gap-2.5 px-2 py-1">
              <ItemMedia variant="icon" className="bg-transparent">
                <StepIcon state={row.state} />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle
                  data-muted={row.state !== "read"}
                  className="data-[muted=true]:text-muted-foreground truncate font-normal"
                >
                  {row.state === "skipped"
                    ? `${row.app.name} is not connected`
                    : row.label}
                </ItemTitle>
              </ItemContent>
              <ItemActions>
                <span className="flex size-5 shrink-0 items-center justify-center">
                  <row.app.logo className="h-3.5 w-auto" />
                </span>
                {row.state === "skipped" ? (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onConnect(row.app.id)}
                  >
                    Connect
                  </Button>
                ) : null}
              </ItemActions>
            </Item>
          ))}
        </FramePanel>

        {/* Held back until the sources have settled, so the frame never
            carries an empty second panel while the steps are still running. */}
        {settled ? (
          <FramePanel fit className="py-3">
            <p className="text-sm/6 text-pretty">
              {streamed}
              {streamed.length < mode.answer.length ? (
                <span
                  className="bg-foreground ms-0.5 inline-block h-[1em] w-0.5 translate-y-0.5"
                  aria-hidden="true"
                />
              ) : null}
            </p>
          </FramePanel>
        ) : null}
      </Frame>
    </div>
  )
}