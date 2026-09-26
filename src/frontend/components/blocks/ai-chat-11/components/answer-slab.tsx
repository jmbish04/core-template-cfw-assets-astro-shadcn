import { useState } from "react"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@/components/ui/marker"
import { MessageFooter } from "@/components/ui/message"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ASSISTANT_NAME,
  MODELS,
  type AssistantTurn,
  type Figure,
  type Payload,
  type StepState,
} from "./data"
import { CodeIcon, CheckIcon, CopyIcon, ThumbsUpIcon, ThumbsDownIcon, RefreshCwIcon } from "lucide-react"

/** Colour never carries a step's outcome alone; each dot ships its own label. */
const STEP_STATE: Record<StepState, { dot: string; label: string }> = {
  done: { dot: "bg-success", label: "Completed" },
  failed: { dot: "bg-destructive", label: "Failed" },
}

const FIGURE_TONE: Record<Figure["tone"], string> = {
  neutral: "text-foreground",
  warning: "text-warning",
  danger: "text-destructive",
}

/** Frosted, not opaque: the dot field stays faintly visible under a turn. */
export const GLASS = "bg-card/75 backdrop-blur-md"

function TracePayload({
  payload,
}: {
  payload: Extract<Payload, { kind: "trace" }>
}) {
  return (
    // A dense run log, not a stack of tiles: one tight line per step, with the
    // dot centred on that line so the column reads as a single spine.
    <ul className="flex flex-col gap-2">
      {payload.steps.map((step) => {
        const state = STEP_STATE[step.state]
        return (
          <li key={step.id} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className={cn("size-1.5 shrink-0 rounded-full", state.dot)}
            />
            <span className="shrink-0 font-mono text-xs">
              {step.tool}
              <span className="sr-only">, {state.label}</span>
            </span>
            <span className="text-muted-foreground min-w-0 truncate text-xs">
              {step.artifact}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function MetricsPayload({
  payload,
}: {
  payload: Extract<Payload, { kind: "metrics" }>
}) {
  return (
    <dl className="grid grid-cols-3 gap-3">
      {payload.figures.map((figure) => (
        <div key={figure.id} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-muted-foreground truncate text-xs">
            {figure.label}
          </dt>
          <dd
            className={cn(
              "truncate text-base font-semibold tabular-nums",
              FIGURE_TONE[figure.tone]
            )}
          >
            {figure.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function PatchPayload({
  payload,
}: {
  payload: Extract<Payload, { kind: "patch" }>
}) {
  return (
    <Item size="sm" variant="outline" className="gap-3">
      <ItemMedia variant="icon">
        <CodeIcon className="size-4" aria-hidden="true" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="truncate font-mono text-xs font-normal">
          {payload.file}
        </ItemTitle>
        <ItemDescription className="flex items-center gap-1.5 text-xs">
          <span>{payload.language}</span>
          <span
            aria-hidden="true"
            className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
          />
          <span className="text-success tabular-nums">+{payload.added}</span>
          <span className="text-destructive tabular-nums">
            &minus;{payload.removed}
          </span>
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

function PayloadStrip({ payload }: { payload: Payload }) {
  if (payload.kind === "trace") return <TracePayload payload={payload} />
  if (payload.kind === "metrics") return <MetricsPayload payload={payload} />
  return <PatchPayload payload={payload} />
}

function CopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard access is denied in some embeds; the reply stays selectable.
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={copy}
            aria-label={copied ? "Reply copied" : "Copy reply"}
          />
        }
      >
        {copied ? (
          <CheckIcon className="text-success size-3.5" aria-hidden="true" />
        ) : (
          <CopyIcon className="size-3.5" aria-hidden="true" />
        )}
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
    </Tooltip>
  )
}

function RatingAction({
  turnId,
  rating,
  onRate,
}: {
  turnId: string
  rating: "up" | "down" | null
  onRate: (turnId: string, next: "up" | "down") => void
}) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Helpful"
              aria-pressed={rating === "up"}
              onClick={() => onRate(turnId, "up")}
            />
          }
        >
          <ThumbsUpIcon className={cn("size-3.5", rating === "up" && "text-success")} aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Helpful</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Not helpful"
              aria-pressed={rating === "down"}
              onClick={() => onRate(turnId, "down")}
            />
          }
        >
          <ThumbsDownIcon className={cn("size-3.5", rating === "down" && "text-destructive")} aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Not helpful</TooltipContent>
      </Tooltip>
    </>
  )
}

/**
 * One assistant reply, rendered as a receipt rather than a bubble: a chrome bar
 * naming the run, the prose, and the typed artifact the run produced.
 */
export function AnswerSlab({
  turn,
  thinking,
  showRunDetails,
  rating,
  onRate,
  onRetry,
}: {
  turn: AssistantTurn
  /** The step the run is on; only read while the turn streams. */
  thinking: string
  /** Hides the latency and token chrome without touching the answer. */
  showRunDetails: boolean
  rating: "up" | "down" | null
  onRate: (turnId: string, next: "up" | "down") => void
  onRetry: (turnId: string) => void
}) {
  const model = MODELS.find((entry) => entry.id === turn.modelId) ?? MODELS[0]
  const streaming = turn.state === "streaming"

  return (
    <div className="group/message flex flex-col gap-1.5">
      <Frame
        dense
        spacing="sm"
        stacked
        className={cn(GLASS, "w-full")}
        aria-busy={streaming || undefined}
      >
        {/* Chrome: who answered, on what, and what the answer cost. */}
        <FrameHeader className="flex-row items-center gap-2 py-2">
          <FrameTitle className="truncate">{ASSISTANT_NAME}</FrameTitle>
          <span
            aria-hidden="true"
            className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
          />
          <span className="text-muted-foreground min-w-0 truncate text-xs">
            {model.name}
          </span>
          {showRunDetails && !streaming && turn.latency ? (
            <span className="text-muted-foreground ms-auto hidden shrink-0 items-center gap-1.5 text-xs tabular-nums sm:flex">
              <span>{turn.latency}</span>
              <span
                aria-hidden="true"
                className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
              />
              <span>{turn.tokens?.toLocaleString("en-US")} tokens</span>
            </span>
          ) : null}
        </FrameHeader>

        <FramePanel>
          {streaming ? (
            <Marker role="status" className="gap-2">
              <MarkerIcon>
                <Spinner className="size-3.5" />
              </MarkerIcon>
              <MarkerContent className="chat11-pulse text-muted-foreground text-sm">
                {thinking}
              </MarkerContent>
            </Marker>
          ) : (
            <p className="text-foreground/90 text-sm leading-relaxed">
              {turn.text}
            </p>
          )}
        </FramePanel>

        {turn.payload && !streaming ? (
          <FramePanel className="bg-muted/40">
            <PayloadStrip payload={turn.payload} />
          </FramePanel>
        ) : null}
      </Frame>

      {/* Actions stay in the flow but fade in, so the thread reads quiet. */}
      {!streaming ? (
        <MessageFooter className="gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
          <CopyAction text={turn.text} />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Retry reply"
                  onClick={() => onRetry(turn.id)}
                />
              }
            >
              <RefreshCwIcon className="size-3.5" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Retry</TooltipContent>
          </Tooltip>
          <RatingAction turnId={turn.id} rating={rating} onRate={onRate} />
        </MessageFooter>
      ) : null}
    </div>
  )
}