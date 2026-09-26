"use client"

import { useState } from "react"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"

import { PREFERENCES } from "./data"

// ── Editor Preferences ──

export function EditorPreferences() {
  const [values, setValues] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREFERENCES.map((p) => [p.id, p.defaultChecked]))
  )

  return (
    <FieldSet className="w-full gap-3">
      <FieldLegend className="sr-only">Editor preferences</FieldLegend>
      {/* Description */}
      <FieldDescription className="sr-only">
        Configure editing behavior and interface density.
      </FieldDescription>

      {/* List */}
      <FieldGroup className="gap-3">
        {PREFERENCES.map((pref) => (
          <Field key={pref.id} orientation="horizontal" className="gap-3">
            <Switch
              id={`settings-3-${pref.id}`}
              checked={values[pref.id]}
              onCheckedChange={(value) =>
                setValues((prev) => ({ ...prev, [pref.id]: value }))
              }
              className="mt-0.5"
            />

            <FieldContent className="gap-0.5">
              <FieldLabel htmlFor={`settings-3-${pref.id}`}>
                {pref.label}
              </FieldLabel>
              <FieldDescription className="text-xs">
                {pref.description}
              </FieldDescription>
            </FieldContent>
          </Field>
        ))}
      </FieldGroup>
    </FieldSet>
  )
}