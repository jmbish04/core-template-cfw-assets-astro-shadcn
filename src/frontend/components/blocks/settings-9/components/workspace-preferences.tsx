"use client"

import { useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  PREFERENCE_SECTIONS,
  type PreferenceItem,
  type SelectOption,
} from "./data"
import { ChevronRightIcon } from "lucide-react"

// ── Preference row ──

function PreferenceRow({ item }: { item: PreferenceItem }) {
  const [selectedValue, setSelectedValue] = useState(
    item.defaultValue ?? item.options?.[0]?.value ?? ""
  )

  return (
    <Item className="px-4">
      {/* Content */}
      <ItemContent>
        <ItemTitle className="gap-2">
          {item.title}
          {item.badge ? (
            <Badge variant={item.badge.variant} size="sm">
              {item.badge.label}
            </Badge>
          ) : null}
        </ItemTitle>
        <ItemDescription>{item.description}</ItemDescription>
      </ItemContent>

      {/* Actions */}
      <ItemActions>
        {item.control === "select" && item.options && (
          <Select
            value={selectedValue}
            onValueChange={(value) => {
              if (value !== null) {
                setSelectedValue(value)
              }
            }}
          >
            <SelectTrigger className="w-40" aria-label={item.title}>
              <SelectValue>
                {getOptionLabel(item.options, selectedValue)}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                {item.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        {item.control === "switch" && (
          <Switch
            defaultChecked={item.defaultChecked}
            aria-label={item.title}
          />
        )}
      </ItemActions>
    </Item>
  )
}

// ── Get Option Label ──

function getOptionLabel(options: SelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

// ── Main component ──

export function WorkspacePreferences() {
  return (
    <div className="w-full max-w-2xl space-y-5">
      {/* Heading */}
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold">Workspace Preferences</h1>
        <p className="text-muted-foreground text-sm">
          Adjust defaults that apply across your entire workspace.
        </p>
      </div>

      {PREFERENCE_SECTIONS.map((section) => (
        <Frame key={section.id} stacked dense spacing="sm">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex w-full">
              <FrameHeader className="flex grow flex-row items-center justify-between gap-2 px-4 py-2">
                <FrameTitle>{section.title}</FrameTitle>
                <ChevronRightIcon className="text-muted-foreground mr-2 size-4 transition-transform in-data-open:rotate-90" aria-hidden="true" />
              </FrameHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <FramePanel className="p-0!">
                {section.items.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && <Separator />}
                    <PreferenceRow item={item} />
                  </div>
                ))}
              </FramePanel>
            </CollapsibleContent>
          </Collapsible>
        </Frame>
      ))}
    </div>
  )
}