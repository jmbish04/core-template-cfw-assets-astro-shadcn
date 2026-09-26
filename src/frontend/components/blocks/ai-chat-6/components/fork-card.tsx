import { useId, type FormEvent } from "react"

import { Card } from "@/components/ui/card"
import {
  Item,
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
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import { FORK_CHOICES, FORK_NAME } from "./data"
import { WIDGET_LABEL } from "./widget-chrome"
import { GitBranchIcon } from "lucide-react"

/** Static icon node: the shadcn CLI cannot resolve icon names from props. */
const ICON_CHOSEN = (
  <GitBranchIcon className="size-4 shrink-0" aria-hidden="true" />
)

export function ForkCard({
  value,
  /** Steps the answer switched off, so the card can say what it cost. */
  droppedCount,
  onAnswer,
}: {
  value: string | null
  droppedCount: number
  onAnswer: (value: string) => void
}) {
  const groupId = useId()
  const chosen = FORK_CHOICES.find((choice) => choice.value === value)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const picked = String(
      new FormData(event.currentTarget).get(FORK_NAME) ?? ""
    )
    const choice = FORK_CHOICES.find((entry) => entry.value === picked)
    if (choice) onAnswer(choice.value)
  }

  if (chosen) {
    return (
      <Card className="w-full overflow-hidden p-0 shadow-none">
        <Item size="sm">
          <ItemMedia className="text-primary">{ICON_CHOSEN}</ItemMedia>
          <ItemContent className="min-w-0 gap-0.5">
            <ItemTitle className="truncate">{chosen.label}</ItemTitle>
            <ItemDescription className="truncate tabular-nums">
              {droppedCount
                ? `Taken forward, ${droppedCount} ${droppedCount === 1 ? "step" : "steps"} switched off`
                : "Taken forward, both drafts kept"}
            </ItemDescription>
          </ItemContent>
        </Item>
      </Card>
    )
  }

  return (
    <div role="group" aria-labelledby={groupId} className="flex flex-col gap-3">
      <h4 id={groupId} className={WIDGET_LABEL}>
        Decision
      </h4>

      {/* One required question, no progress and no skip: this is a fork in the
          work, not a form, so it offers exactly one way forward. */}
      <Questionnaire
        items={[
          {
            name: FORK_NAME,
            required: true,
            choices: FORK_CHOICES.map((choice) => ({ value: choice.value })),
          },
        ]}
        defaultItem={FORK_NAME}
        shortcuts="letters"
        onSubmit={handleSubmit}
        className="gap-3"
      >
        <QuestionnaireItem name={FORK_NAME} required className="gap-3">
          <QuestionnaireTitle className="text-sm font-medium">
            Which cause do I take forward?
          </QuestionnaireTitle>

          <QuestionnaireChoices>
            {FORK_CHOICES.map((choice) => (
              <QuestionnaireChoice key={choice.value} value={choice.value}>
                <span className="text-sm">{choice.label}</span>
                <QuestionnaireChoiceDescription className="text-xs">
                  {choice.hint}
                </QuestionnaireChoiceDescription>
              </QuestionnaireChoice>
            ))}
          </QuestionnaireChoices>

          <QuestionnaireError />
        </QuestionnaireItem>

        <QuestionnaireActions>
          <QuestionnaireSubmit size="sm">Resume Run</QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
    </div>
  )
}