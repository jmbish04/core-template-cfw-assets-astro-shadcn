import { useState } from "react"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { ColorPicker } from "./color-picker"
import { CURRENCIES, DAYS, REGIONS } from "./data"
import { EditorPreferences } from "./editor-preferences"
import { SettingField } from "./setting-field"
import { PlusIcon, UploadIcon, GlobeIcon, CircleDollarSignIcon } from "lucide-react"

export function GeneralSettings() {
  const [dateFormat, setDateFormat] = useState(["mdy"])
  const [startOfWeek, setStartOfWeek] = useState("monday")
  const [region, setRegion] = useState("us")
  const [currency, setCurrency] = useState("usd")
  const handleStartOfWeekChange = (value: string | null) => {
    if (value !== null) {
      setStartOfWeek(value)
    }
  }
  const handleRegionChange = (value: string | null) => {
    if (value !== null) {
      setRegion(value)
    }
  }
  const handleCurrencyChange = (value: string | null) => {
    if (value !== null) {
      setCurrency(value)
    }
  }

  return (
    <Frame className="w-full max-w-3xl">
      <FrameHeader className="px-2! py-2.5!">
        <FrameTitle>General Settings</FrameTitle>
        <FrameDescription>Core app preferences.</FrameDescription>
      </FrameHeader>

      <FramePanel className="p-0">
        <FieldGroup className="gap-0">
          {/* ── Project name ── */}
          <SettingField
            title="Project name"
            description="The display name for your project across the platform."
            labelFor="settings-3-project-name"
          >
            <Input id="settings-3-project-name" defaultValue="Acme Dashboard" />
          </SettingField>

          {/* ── API endpoint ── */}
          <SettingField
            title="API endpoint"
            description="Set the base URL for your project API."
            badge={{ label: "Required", variant: "destructive-light" }}
            labelFor="settings-3-api-endpoint"
          >
            <InputGroup className="w-full">
              <InputGroupAddon align="inline-start">
                <InputGroupText>https://</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="settings-3-api-endpoint"
                defaultValue="api.acme.io"
              />
            </InputGroup>
          </SettingField>

          {/* ── Start of week ── */}
          <SettingField
            title="Start of week"
            description="Choose which day marks the start of your week."
            labelFor="settings-3-start-of-week"
          >
            <Select value={startOfWeek} onValueChange={handleStartOfWeekChange}>
              <SelectTrigger id="settings-3-start-of-week" className="w-full">
                <SelectValue>{getOptionLabel(DAYS, startOfWeek)}</SelectValue>
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  {DAYS.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SettingField>

          {/* ── Allowed origins ── */}
          <SettingField
            title="Allowed origins"
            description="Define the trusted domains for CORS requests."
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline">
                <PlusIcon aria-hidden="true" />
                Add origin
              </Button>

              <Button variant="outline">
                <UploadIcon aria-hidden="true" />
                Import from file
              </Button>
            </div>
          </SettingField>

          {/* ── Accent color ── */}
          <SettingField
            title="Accent color"
            description="Select a color to represent your brand."
            badge={{ label: "Upgrade to Pro", variant: "primary-light" }}
          >
            <ColorPicker />
          </SettingField>

          {/* ── Region & currency ── */}
          <SettingField
            title="Region & currency"
            description="Adjust your regional preferences and currency."
            contentClassName="@md/field-group:w-[22rem]"
          >
            <FieldSet className="w-full gap-3">
              <FieldLegend className="sr-only">Region and currency</FieldLegend>
              <FieldDescription className="sr-only">
                Regional and financial formatting preferences.
              </FieldDescription>

              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel htmlFor="settings-3-region">Region</FieldLabel>
                  <Select value={region} onValueChange={handleRegionChange}>
                    <SelectTrigger id="settings-3-region" className="w-full">
                      <GlobeIcon aria-hidden="true" />
                      <SelectValue>
                        {getOptionLabel(REGIONS, region)}
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent>
                      <SelectGroup>
                        {REGIONS.map((region) => (
                          <SelectItem key={region.value} value={region.value}>
                            {region.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="settings-3-currency">
                    Currency
                  </FieldLabel>
                  <Select value={currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger id="settings-3-currency" className="w-full">
                      <CircleDollarSignIcon aria-hidden="true" />
                      <SelectValue>
                        {getOptionLabel(CURRENCIES, currency)}
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent>
                      <SelectGroup>
                        {CURRENCIES.map((currency) => (
                          <SelectItem
                            key={currency.value}
                            value={currency.value}
                          >
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </FieldSet>
          </SettingField>

          {/* ── Date display format ── */}
          <SettingField
            title="Date display format"
            description="Choose your preferred format for dates."
          >
            <ToggleGroup
              multiple={false}
              value={dateFormat}
              onValueChange={(value) => {
                if (value.length > 0) setDateFormat(value)
              }}
              variant="outline"
              size="sm"
              aria-label="Date display format"
            >
              <ToggleGroupItem value="mdy">MM/DD/YYYY</ToggleGroupItem>
              <ToggleGroupItem value="dmy">DD/MM/YYYY</ToggleGroupItem>
              <ToggleGroupItem value="ymd">YYYY/MM/DD</ToggleGroupItem>
            </ToggleGroup>
          </SettingField>

          {/* ── Editor preferences ── */}
          <SettingField
            title="Editor preferences"
            description="Adjust your editing environment and display options."
            last
            contentClassName="@md/field-group:w-[22rem]"
          >
            <EditorPreferences />
          </SettingField>
        </FieldGroup>
      </FramePanel>

      <FrameFooter className="flex flex-row justify-end gap-3">
        <Button variant="outline">Reset</Button>
        <Button>Save changes</Button>
      </FrameFooter>
    </Frame>
  )
}

// ── Helper functions ──

function getOptionLabel(
  options: Array<{ value: string; label: string }>,
  value: string
) {
  return options.find((option) => option.value === value)?.label ?? value
}