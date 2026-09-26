import { useId } from "react"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Item, ItemGroup } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import type { PlanRun } from "./agent"
import { PLAN_STEPS } from "./data"
import { WIDGET_LABEL } from "./widget-chrome"
import { CircleCheckIcon, CircleDotIcon, AlertCircleIcon, CircleXIcon, FileTextIcon, DownloadIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_DONE = (
  <CircleCheckIcon className="size-4 shrink-0" aria-hidden="true" />
)

const ICON_QUEUED = (
  <CircleDotIcon className="size-4 shrink-0" aria-hidden="true" />
)

const ICON_FAILED = (
  <AlertCircleIcon className="size-4 shrink-0" aria-hidden="true" />
)

const ICON_SKIPPED = (
  <CircleXIcon className="size-4 shrink-0" aria-hidden="true" />
)

const ICON_ARTIFACT = (
  <FileTextIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_DOWNLOAD = (
  <DownloadIcon aria-hidden="true" />
)

function segmentTone({
  step,
  stepIds,
  doneIds,
  skippedIds,
  failedId,
  runningId,
}: {
  step: { id: string }
  stepIds: string[]
  doneIds: string[]
  skippedIds: string[]
  failedId: string | null
  runningId?: string
}) {
  if (failedId === step.id) return "bg-destructive"
  if (doneIds.includes(step.id)) return "bg-primary"
  if (runningId === step.id) return "bg-primary/40"
  if (!stepIds.includes(step.id) || skippedIds.includes(step.id))
    return "bg-muted-foreground/25"
  return "bg-muted"
}

/** One label column for both row states, on the questionnaire choice row's own
    metrics. items-start because the label primitive centres its cross axis. */
const LABEL_COLUMN =
  "flex min-w-0 flex-1 flex-col items-start gap-0.5 text-start font-normal"

function MARKER_TONE(failed: boolean, done: boolean, running: boolean) {
  if (failed) return "text-destructive"
  if (done) return "text-success"
  if (running) return "text-primary"
  return "text-muted-foreground"
}

function StepLines({
  index,
  title,
  on,
  detail,
  failed = false,
}: {
  index: number
  title: string
  /** Off, the step never runs, so its title carries that rather than a colour. */
  on: boolean
  detail: string
  failed?: boolean
}) {
  return (
    <>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {index + 1}
        </span>
        <span
          className={`truncate text-sm ${on ? "" : "text-muted-foreground line-through"}`}
        >
          {title}
        </span>
      </span>
      <span
        className={`truncate text-xs ${failed ? "text-destructive" : "text-muted-foreground"}`}
      >
        {detail}
      </span>
    </>
  )
}

export function PlanCard({
  stepIds,
  planRun,
  doneIds,
  skippedIds,
  failedId,
  onStepToggle,
  onRun,
  onStop,
  onRetry,
  onSkip,
  onDownload,
}: {
  /** Steps still switched on. Everything else is skipped. */
  stepIds: string[]
  planRun: PlanRun
  doneIds: string[]
  skippedIds: string[]
  failedId: string | null
  onStepToggle: (id: string, on: boolean) => void
  onRun: () => void
  onStop: () => void
  onRetry: () => void
  onSkip: () => void
  onDownload: (name: string) => void
}) {
  const groupId = useId()
  const queue = PLAN_STEPS.filter((step) => stepIds.includes(step.id))
  const done = PLAN_STEPS.filter((step) => doneIds.includes(step.id))
  const settled = queue.filter(
    (step) => doneIds.includes(step.id) || skippedIds.includes(step.id)
  )
  // The finished runtime sums what actually ran, so switching a step off or
  // skipping past a failure changes the total the plan reports.
  const ranSeconds = done.reduce((total, step) => total + step.tookSeconds, 0)
  const failedStep = PLAN_STEPS.findIndex((step) => step.id === failedId)
  const running =
    planRun === "running"
      ? queue.find(
          (step) => !doneIds.includes(step.id) && !skippedIds.includes(step.id)
        )
      : undefined

  const summary = running
    ? `Step ${settled.length + 1} of ${queue.length}`
    : planRun === "failed"
      ? `Step ${failedStep + 1} could not finish`
      : planRun === "paused"
        ? "Answer below to resume"
        : planRun === "done"
          ? `Finished in ${ranSeconds}s`
          : settled.length
            ? `${queue.length - settled.length} steps left`
            : queue.length
              ? `${queue.length} steps queued`
              : "Every step is switched off"

  return (
    <div role="group" aria-labelledby={groupId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <h4 id={groupId} className={WIDGET_LABEL}>
          Plan
        </h4>
        {/* One segment per step, in plan order, so completion and sequence are
            legible before a single row is read. */}
        <div className="flex gap-1" aria-hidden="true">
          {PLAN_STEPS.map((step) => (
            <span
              key={step.id}
              className={`h-1 flex-1 rounded-full ${segmentTone({
                step,
                stepIds,
                doneIds,
                skippedIds,
                failedId,
                runningId: running?.id,
              })}`}
            />
          ))}
        </div>
        {/* Not a live region: the panel header owns the one announcement, so
            a step landing is not read out twice. */}
        <p className="text-muted-foreground text-xs tabular-nums">{summary}</p>
      </div>

      {/* Discrete rows on the questionnaire's own metrics, so a step and a
          brief answer read as the same kind of object. */}
      <ItemGroup role="group" aria-label="Plan steps" className="gap-2">
        {PLAN_STEPS.map((step, index) => {
          const fieldId = `${groupId}-${step.id}`
          const on = stepIds.includes(step.id)
          const isDone = doneIds.includes(step.id)
          const isSkipped = skippedIds.includes(step.id)
          const isFailed = failedId === step.id
          const isRunning = running?.id === step.id
          const artifactName = step.artifact?.name ?? ""
          // Editable only before the run starts: retiming a plan mid flight
          // would leave the transcript describing work that never happened.
          const editable =
            planRun === "idle" && !isDone && !isSkipped && !isFailed
          const status = isFailed
            ? (step.failure ?? "Could not finish")
            : isSkipped
              ? "Skipped"
              : !on
                ? "Not run"
                : isRunning
                  ? "Running"
                  : isDone
                    ? "Done"
                    : "Queued"

          return (
            <div key={step.id} className="flex flex-col gap-1.5">
              <Item
                variant={isRunning || isFailed ? "muted" : "outline"}
                size="sm"
                className="focus-within:border-ring focus-within:ring-ring/50 items-start focus-within:ring-[3px]"
              >
                {editable ? (
                  <Field
                    orientation="horizontal"
                    className="w-full min-w-0 items-start gap-2.5"
                  >
                    <Checkbox
                      id={fieldId}
                      checked={on}
                      onCheckedChange={(checked) =>
                        onStepToggle(step.id, checked === true)
                      }
                      className="mt-0.5"
                    />
                    <FieldLabel htmlFor={fieldId} className={LABEL_COLUMN}>
                      <StepLines
                        index={index}
                        title={step.title}
                        on={on}
                        detail={step.detail}
                      />
                    </FieldLabel>
                  </Field>
                ) : (
                  <>
                    <span
                      className={`mt-0.5 flex ${MARKER_TONE(isFailed, isDone, isRunning)}`}
                    >
                      {isFailed ? (
                        ICON_FAILED
                      ) : isSkipped || !on ? (
                        ICON_SKIPPED
                      ) : isDone ? (
                        ICON_DONE
                      ) : isRunning ? (
                        <Spinner
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        ICON_QUEUED
                      )}
                    </span>
                    <span className={LABEL_COLUMN}>
                      <StepLines
                        index={index}
                        title={step.title}
                        on={on}
                        detail={status}
                        failed={isFailed}
                      />
                    </span>
                  </>
                )}

                {isDone ? (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {step.tookSeconds}s
                  </span>
                ) : null}
              </Item>

              {/* The artifact belongs to the step that made it, so it lands
                  under that row rather than in a pile at the end. */}
              {isDone && step.artifact ? (
                <Attachment size="xs" className="ms-6 max-w-full">
                  <AttachmentMedia className="text-muted-foreground">
                    {ICON_ARTIFACT}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{step.artifact.name}</AttachmentTitle>
                    <AttachmentDescription className="tabular-nums">
                      {step.artifact.meta}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      type="button"
                      aria-label={`Download ${step.artifact.name}`}
                      onClick={() => onDownload(artifactName)}
                    >
                      {ICON_DOWNLOAD}
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ) : null}
            </div>
          )
        })}
      </ItemGroup>

      {planRun === "failed" ? (
        // Skip left, Retry right: the same secondary-then-primary order the
        // brief's Previous and Next use, so the pair reads the same way.
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onSkip}
            className="col-start-2 justify-self-end"
          >
            Skip
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onRetry}
            className="col-start-3 justify-self-end"
          >
            Retry
          </Button>
        </div>
      ) : planRun === "running" ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onStop}
            className="col-start-2 justify-self-end"
          >
            Stop
          </Button>
        </div>
      ) : planRun === "done" || planRun === "paused" ? null : (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!queue.length}
            onClick={onRun}
            className="col-start-2 justify-self-end"
          >
            {settled.length ? "Resume" : "Run Plan"}
          </Button>
        </div>
      )}
    </div>
  )
}