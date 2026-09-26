"use client"

import type { FormEvent } from "react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"

import type { MessagePart, QuestionnaireQuestion } from "./data"

type QuestionnairePart = Extract<MessagePart, { kind: "questionnaire" }>

/** One answered question, resolved to the labels the choices showed. */
export type ScopeAnswer = { title: string; values: string[] }

/** Reads the submitted form back as labels rather than raw values. */
function readAnswers(
  form: HTMLFormElement,
  questions: QuestionnaireQuestion[]
): ScopeAnswer[] {
  const data = new FormData(form)
  return questions.map((question) => {
    const raw = data.getAll(question.name).map(String).filter(Boolean)
    return {
      title: question.title,
      values: raw.map((value) => {
        const choice = question.choices.find((item) => item.value === value)
        return choice ? choice.label : value
      }),
    }
  })
}

export function ChatQuestionnaire({
  part,
  answers,
  onSubmit,
}: {
  part: QuestionnairePart
  /** Set once submitted, which swaps the form for what was answered. */
  answers: ScopeAnswer[] | undefined
  onSubmit: (answers: ScopeAnswer[]) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(readAnswers(event.currentTarget, part.questions))
  }

  return (
    <Card className="shadow-none">
      <CardContent>
        {answers ? (
          <dl className="grid gap-3 text-sm">
            {answers.map((answer) => (
              <div key={answer.title} className="grid gap-0.5">
                <dt className="text-muted-foreground text-xs">
                  {answer.title}
                </dt>
                <dd>
                  {answer.values.length ? answer.values.join(", ") : "Skipped"}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <Questionnaire
            items={part.questions.map((question) => ({
              name: question.name,
              required: question.required,
              choices: question.choices.map((choice) => ({
                value: choice.value,
              })),
            }))}
            defaultItem={part.questions[0].name}
            shortcuts="letters"
            onSubmit={handleSubmit}
            className="gap-4"
          >
            <QuestionnaireProgress />

            {part.questions.map((question) => (
              <QuestionnaireItem
                key={question.name}
                name={question.name}
                multiple={question.multiple}
                required={question.required}
                className="gap-3"
              >
                <QuestionnaireTitle>{question.title}</QuestionnaireTitle>
                <QuestionnaireDescription>
                  {question.description}
                </QuestionnaireDescription>

                <QuestionnaireChoices>
                  {question.choices.map((choice) => (
                    <QuestionnaireChoice
                      key={choice.value}
                      value={choice.value}
                    >
                      <span className="font-medium">{choice.label}</span>
                      {choice.hint ? (
                        <QuestionnaireChoiceDescription>
                          {choice.hint}
                        </QuestionnaireChoiceDescription>
                      ) : null}
                    </QuestionnaireChoice>
                  ))}

                  {question.input ? (
                    <QuestionnaireInput
                      aria-label={question.input.label}
                      placeholder={question.input.placeholder}
                    />
                  ) : null}
                </QuestionnaireChoices>

                <QuestionnaireError />
              </QuestionnaireItem>
            ))}

            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireSkip />
              <QuestionnaireNext>Next</QuestionnaireNext>
              <QuestionnaireSubmit>Write the plan</QuestionnaireSubmit>
            </QuestionnaireActions>
          </Questionnaire>
        )}
      </CardContent>
    </Card>
  )
}