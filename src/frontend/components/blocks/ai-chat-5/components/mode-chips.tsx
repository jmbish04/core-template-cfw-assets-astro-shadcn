import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"

import { MODES, type ModeId } from "./data"

/** Ties each card's label to the radio it activates. */
const MODE_FIELD_ID = "ai-chat-5-mode"

/**
 * The four jobs this assistant does. Picking one rewrites the placeholder and
 * changes which apps the next run will need, so it is a setting, not a button.
 */
export function ModeChips({
  mode,
  onModeChange,
}: {
  mode: ModeId
  onModeChange: (id: ModeId) => void
}) {
  return (
    <RadioGroup
      value={mode}
      onValueChange={(next: ModeId) => onModeChange(next)}
      aria-label="What to do"
      // One element carries both the radiogroup role and the card row.
      render={
        <FieldGroup className="flex-row flex-wrap justify-center gap-x-2 gap-y-4" />
      }
    >
      {MODES.map((item) => {
        const fieldId = `${MODE_FIELD_ID}-${item.id}`

        return (
          <FieldLabel
            key={item.id}
            htmlFor={fieldId}
            // The label goes full width around a Field, hence w-auto!, and it
            // owns the ring because the control inside it is undrawn.
            className="has-data-checked:border-primary/50 has-data-checked:bg-primary/5 dark:has-data-checked:bg-primary/10 has-[:focus-visible]:ring-ring/50 relative w-auto! cursor-pointer p-0 transition-colors has-[:focus-visible]:ring-[3px]"
          >
            {/* The card's padding is the label's to give and it ranges from 8
                to 16px across styles, so the chip pins its own box instead. */}
            <Field orientation="horizontal" className="h-8 px-3 py-0">
              <RadioGroupItem
                id={fieldId}
                value={item.id}
                // Undrawn, not removed: it still takes focus and arrow keys,
                // and its data-checked is what the card's own styles read.
                className="sr-only"
              />
              <FieldTitle className="gap-1.5">
                {item.icon}
                {item.label}
              </FieldTitle>
            </Field>
          </FieldLabel>
        )
      })}
    </RadioGroup>
  )
}