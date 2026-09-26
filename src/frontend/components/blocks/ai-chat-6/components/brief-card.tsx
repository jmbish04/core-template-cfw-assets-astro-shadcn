import { useId, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import {
  BRIEF_DEADLINE,
  BRIEF_DEPTH,
  BRIEF_QUESTIONS,
  BRIEF_SOURCES,
  briefSummary,
} from "./data"
import { WIDGET_LABEL } from "./widget-chrome"
import { LayersIcon } from "lucide-react"

/** Static icon node: the shadcn CLI cannot resolve icon names from props. */
const ICON_READING = (
  <LayersIcon className="size-4 shrink-0" aria-hidden="true" />
)

export type BriefAnswers = {
  sources: string[]
  depth: string
  deadline: string
}

export function BriefCard({
  answers,
  /** True once a run or a ticket depends on the brief, so Change destroys work. */
  hasDownstream,
  onSubmit,
  onReopen,
}: {
  /** Set once the brief is agreed, which swaps the form for what it agreed to. */
  answers: BriefAnswers | null
  hasDownstream: boolean
  onSubmit: (answers: BriefAnswers) => void
  onReopen: () => void
}) {
  const groupId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit({
      sources: data.getAll(BRIEF_SOURCES).map(String),
      depth: String(data.get(BRIEF_DEPTH) ?? ""),
      deadline: String(data.get(BRIEF_DEADLINE) ?? ""),
    })
  }

  if (answers) {
    return (
      <Card className="w-full overflow-hidden p-0 shadow-none">
        <Item size="sm">
          <ItemMedia className="text-primary">{ICON_READING}</ItemMedia>
          <ItemContent className="min-w-0 gap-0.5">
            <ItemTitle className="tabular-nums">
              Reading {answers.sources.length}{" "}
              {answers.sources.length === 1 ? "source" : "sources"}
            </ItemTitle>
            <ItemDescription className="truncate">
              {briefSummary(BRIEF_SOURCES, answers.sources)}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              // Named for the consequence: this button throws away the run.
              aria-label={
                hasDownstream
                  ? "Change the brief, which discards the run below"
                  : "Change the brief"
              }
              onClick={onReopen}
              className="text-muted-foreground hover:text-foreground h-7 font-normal"
            >
              Change
            </Button>
          </ItemActions>
        </Item>
      </Card>
    )
  }

  return (
    <div role="group" aria-labelledby={groupId} className="flex flex-col gap-3">
      <h4 id={groupId} className={WIDGET_LABEL}>
        Brief
      </h4>

      <Questionnaire
        items={BRIEF_QUESTIONS.map((question) => ({
          name: question.name,
          required: true,
          choices: question.choices.map((choice) => ({ value: choice.value })),
        }))}
        defaultItem={BRIEF_QUESTIONS[0].name}
        shortcuts="letters"
        onSubmit={handleSubmit}
        className="gap-3"
      >
        {/* Segments rather than a sentence: three questions is short enough
            that the reader should see the whole shape of the ask at once. */}
        <QuestionnaireProgress
          className="w-full"
          render={(props, state) => (
            <div {...props}>
              <div className="mb-1.5 flex gap-1" aria-hidden="true">
                {Array.from({ length: state.total }, (_, index) => (
                  <span
                    key={index}
                    className={
                      index < state.current
                        ? "bg-primary h-1 flex-1 rounded-full"
                        : "bg-muted h-1 flex-1 rounded-full"
                    }
                  />
                ))}
              </div>
              <span className="text-muted-foreground text-xs tabular-nums">
                Question {state.current} of {state.total}
              </span>
            </div>
          )}
        />

        {BRIEF_QUESTIONS.map((question) => (
          <QuestionnaireItem
            key={question.name}
            name={question.name}
            multiple={question.multiple}
            required
            className="gap-2.5"
          >
            <QuestionnaireTitle className="text-sm font-medium">
              {question.title}
            </QuestionnaireTitle>

            <QuestionnaireChoices>
              {question.choices.map((choice) => (
                <QuestionnaireChoice
                  key={choice.value}
                  value={choice.value}
                  defaultChecked={choice.preset}
                >
                  <span className="text-sm">{choice.label}</span>
                  {choice.hint ? (
                    <QuestionnaireChoiceDescription className="text-xs">
                      {choice.hint}
                    </QuestionnaireChoiceDescription>
                  ) : null}
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>

            <QuestionnaireError />
          </QuestionnaireItem>
        ))}

        <QuestionnaireActions>
          <QuestionnairePrevious size="sm" />
          <QuestionnaireNext size="sm">Next</QuestionnaireNext>
          <QuestionnaireSubmit size="sm">Start Work</QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
    </div>
  )
}