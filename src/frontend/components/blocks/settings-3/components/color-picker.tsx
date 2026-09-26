"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

import { FieldLegend, FieldSet } from "@/components/ui/field"
import { ACCENT_COLORS } from "./data"
import { CheckIcon } from "lucide-react"

// ── Color Picker ──

export function ColorPicker() {
  const [selected, setSelected] = useState(ACCENT_COLORS[0].value)

  return (
    <FieldSet className="gap-0">
      <FieldLegend className="sr-only">Accent color</FieldLegend>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {ACCENT_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            aria-label={color.name}
            onClick={() => setSelected(color.value)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-shadow",
              selected === color.value &&
                "ring-ring ring-offset-background ring-2 ring-offset-2"
            )}
            style={{ backgroundColor: color.value }}
          >
            {selected === color.value ? (
              <CheckIcon className="size-3 text-white" aria-hidden="true" />
            ) : null}
          </button>
        ))}
      </div>
    </FieldSet>
  )
}