"use client"

import { useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

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

import { SECURITY_SECTIONS, type SecurityItem, type SelectOption } from "./data"

// ── Security row ──

function SecurityRow({ item }: { item: SecurityItem }) {
  const [selectedValue, setSelectedValue] = useState(
    item.defaultValue ??
      item.options?.find((option) => option.value !== null)?.value ??
      ""
  )

  return (
    <Item className="px-4">
      {/* Content */}
      <ItemContent>
        <ItemTitle>{item.title}</ItemTitle>
        <ItemDescription>{item.description}</ItemDescription>
      </ItemContent>

      {/* Actions */}
      <ItemActions>
        {item.control === "switch" && (
          <Switch
            defaultChecked={item.defaultChecked}
            aria-label={item.title}
          />
        )}
        {item.control === "select" && item.options && (
          <Select
            value={selectedValue}
            onValueChange={(value) => {
              if (value !== null) {
                setSelectedValue(value)
              }
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue>
                {getOptionLabel(item.options, selectedValue)}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                {item.options
                  .filter((opt) => opt.value !== null)
                  .map((opt) => (
                    <SelectItem key={opt.value} value={opt.value!}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        {item.control === "badge" && item.badgeLabel && (
          <Badge variant={item.badgeColor}>{item.badgeLabel}</Badge>
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

export function SecuritySettings() {
  return (
    <div className="w-full max-w-2xl space-y-5">
      {/* Heading */}
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold">Security</h1>
        <p className="text-muted-foreground text-sm">
          Define authentication rules and access boundaries for your workspace.
        </p>
      </div>

      {SECURITY_SECTIONS.map((section) => (
        <Frame key={section.id}>
          <FrameHeader>
            <FrameTitle>{section.title}</FrameTitle>
            {section.description && (
              <FrameDescription>{section.description}</FrameDescription>
            )}
          </FrameHeader>
          <FramePanel className="p-0!">
            {section.items.map((item, index) => (
              <div key={item.id}>
                {index > 0 && <Separator />}
                <SecurityRow item={item} />
              </div>
            ))}
          </FramePanel>
        </Frame>
      ))}
    </div>
  )
}