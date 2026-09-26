/**
 * @fileoverview PreferencesForm — Appearance, Language & region, and
 * Accessibility preferences, built on ReUI settings-9 (collapsible Frame
 * sections of Item rows mixing Select and Switch controls).
 *
 * Loads the single 'default' row from `GET /api/settings/preferences` and saves
 * the working copy with `PUT /api/settings/preferences` via the footer
 * save + discard bar. Discard restores the last saved snapshot.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChevronRightIcon } from "lucide-react";

import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { apiGet, ApiError, apiSend } from "@/lib/api";

import {
  InlineError,
  type Option,
  RowSkeleton,
  SaveBar,
  SettingRow,
  SettingsRows,
  useSavedFlash,
} from "./shared";

// ---------------------------------------------------------------------------
// Wire types — mirror `selectPreferencesSchema`.
// ---------------------------------------------------------------------------

interface Preferences {
  id: string;
  theme: string;
  accentColor: string;
  fontSize: string;
  density: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  animations: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  screenReader: boolean;
  keyboardShortcuts: boolean;
  updatedAt: string | number | Date;
}

type Editable = Omit<Preferences, "id" | "updatedAt">;
type BoolKey = {
  [K in keyof Editable]: Editable[K] extends boolean ? K : never;
}[keyof Editable];
type StringKey = Exclude<keyof Editable, BoolKey>;

/** Strip read-only fields so snapshots compare only what the form edits. */
function editable(p: Preferences & { createdAt?: unknown }): Editable {
  const { id: _id, updatedAt: _u, createdAt: _c, ...rest } = p;
  return rest;
}

// ---------------------------------------------------------------------------
// Section definitions (settings-9 PREFERENCE_SECTIONS shape, real fields)
// ---------------------------------------------------------------------------

type Row =
  | { kind: "select"; key: StringKey; title: string; description: string; options: Option[] }
  | { kind: "switch"; key: BoolKey; title: string; description: string }
  | { kind: "color"; key: "accentColor"; title: string; description: string };

const SECTIONS: { id: string; title: string; rows: Row[] }[] = [
  {
    id: "appearance",
    title: "Appearance",
    rows: [
      {
        kind: "select",
        key: "theme",
        title: "Theme",
        description: "Color scheme used across the interface.",
        options: [
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ],
      },
      {
        kind: "color",
        key: "accentColor",
        title: "Accent color",
        description: "Hex accent applied to highlights and primary actions.",
      },
      {
        kind: "select",
        key: "fontSize",
        title: "Font size",
        description: "Base font size token.",
        options: [
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ],
      },
      {
        kind: "select",
        key: "density",
        title: "Density",
        description: "Spacing between interface elements.",
        options: [
          { value: "compact", label: "Compact" },
          { value: "comfortable", label: "Comfortable" },
          { value: "spacious", label: "Spacious" },
        ],
      },
    ],
  },
  {
    id: "region",
    title: "Language & region",
    rows: [
      {
        kind: "select",
        key: "language",
        title: "Language",
        description: "Interface language.",
        options: [
          { value: "en", label: "English" },
          { value: "fr", label: "Français" },
          { value: "de", label: "Deutsch" },
          { value: "es", label: "Español" },
          { value: "ja", label: "日本語" },
        ],
      },
      {
        kind: "select",
        key: "timezone",
        title: "Timezone",
        description: "Used to render dates and times.",
        options: [
          { value: "UTC", label: "UTC" },
          { value: "America/New_York", label: "New York" },
          { value: "America/Los_Angeles", label: "Los Angeles" },
          { value: "Europe/London", label: "London" },
          { value: "Europe/Berlin", label: "Berlin" },
          { value: "Asia/Tokyo", label: "Tokyo" },
        ],
      },
      {
        kind: "select",
        key: "dateFormat",
        title: "Date format",
        description: "How calendar dates are displayed.",
        options: [
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
        ],
      },
      {
        kind: "select",
        key: "timeFormat",
        title: "Time format",
        description: "12- or 24-hour clock.",
        options: [
          { value: "12h", label: "12-hour" },
          { value: "24h", label: "24-hour" },
        ],
      },
      {
        kind: "select",
        key: "numberFormat",
        title: "Number format",
        description: "Locale used for grouping and decimals.",
        options: [
          { value: "en-US", label: "1,234.56" },
          { value: "de-DE", label: "1.234,56" },
          { value: "fr-FR", label: "1 234,56" },
        ],
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    rows: [
      {
        kind: "switch",
        key: "animations",
        title: "Animations",
        description: "Enable transitions and motion across the interface.",
      },
      {
        kind: "switch",
        key: "reducedMotion",
        title: "Reduced motion",
        description: "Honor the operating system's reduced-motion preference.",
      },
      {
        kind: "switch",
        key: "highContrast",
        title: "High contrast",
        description: "Increase contrast of text and controls for legibility.",
      },
      {
        kind: "switch",
        key: "screenReader",
        title: "Screen reader optimizations",
        description: "Emit richer ARIA markup tuned for assistive technology.",
      },
      {
        kind: "switch",
        key: "keyboardShortcuts",
        title: "Keyboard shortcuts",
        description: "Enable global keyboard shortcut bindings.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Row control
// ---------------------------------------------------------------------------

function RowControl({
  row,
  prefs,
  update,
}: {
  row: Row;
  prefs: Editable;
  update: (patch: Partial<Editable>) => void;
}) {
  if (row.kind === "switch") {
    return (
      <Switch
        aria-label={row.title}
        checked={prefs[row.key]}
        onCheckedChange={(checked) => update({ [row.key]: checked })}
      />
    );
  }
  if (row.kind === "color") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Accent color"
          value={prefs.accentColor}
          onChange={(e) => update({ accentColor: e.target.value })}
          className="size-9 cursor-pointer rounded-md border bg-transparent"
        />
        <Input
          aria-label="Accent color hex"
          value={prefs.accentColor}
          onChange={(e) => update({ accentColor: e.target.value })}
          spellCheck={false}
          className="w-28 font-mono"
        />
      </div>
    );
  }
  return (
    <Select
      items={row.options}
      value={prefs[row.key]}
      onValueChange={(next) => {
        if (typeof next === "string") update({ [row.key]: next });
      }}
    >
      <SelectTrigger className="w-40" aria-label={row.title}>
        <SelectValue placeholder={`Select ${row.title.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {row.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PreferencesForm() {
  const [savedPrefs, setSavedPrefs] = useState<Editable | null>(null);
  const [prefs, setPrefs] = useState<Editable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, flashSaved] = useSavedFlash();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = editable(await apiGet<Preferences>("settings/preferences"));
      setSavedPrefs(row);
      setPrefs(row);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Couldn't load preferences. Refresh the page to try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = useCallback((patch: Partial<Editable>) => {
    setPrefs((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(savedPrefs),
    [prefs, savedPrefs],
  );

  const save = useCallback(async () => {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    try {
      const row = editable(
        await apiSend<Preferences>("PUT", "settings/preferences", prefs),
      );
      setSavedPrefs(row);
      setPrefs(row);
      flashSaved();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Couldn't save preferences. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }, [prefs, flashSaved]);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <InlineError message={error} />

      {SECTIONS.map((section) => (
        <Frame key={section.id} stacked dense spacing="sm">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex w-full">
              <FrameHeader className="flex grow flex-row items-center justify-between gap-2 px-4 py-2">
                <FrameTitle>{section.title}</FrameTitle>
                <ChevronRightIcon
                  className="text-muted-foreground mr-2 size-4 transition-transform in-data-open:rotate-90"
                  aria-hidden="true"
                />
              </FrameHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FramePanel className="p-0!">
                {loading || !prefs ? (
                  <SettingsRows>
                    <RowSkeleton />
                    <RowSkeleton />
                  </SettingsRows>
                ) : (
                  <SettingsRows>
                    {section.rows.map((row) => (
                      <SettingRow
                        key={row.key}
                        title={row.title}
                        description={row.description}
                        control={<RowControl row={row} prefs={prefs} update={update} />}
                      />
                    ))}
                  </SettingsRows>
                )}
              </FramePanel>
            </CollapsibleContent>
          </Collapsible>
        </Frame>
      ))}

      <SaveBar
        dirty={dirty}
        saving={saving}
        saved={saved}
        disabled={!prefs}
        onSave={save}
        onDiscard={() => setPrefs(savedPrefs)}
      />
    </div>
  );
}
