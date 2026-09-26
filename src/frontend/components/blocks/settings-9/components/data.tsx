import { type BadgeProps } from "@/components/reui/badge"

// ── Types ──

export interface SelectOption {
  label: string
  value: string
}

export interface PreferenceBadge {
  label: string
  variant: BadgeProps["variant"]
}

export interface PreferenceItem {
  id: string
  title: string
  description: string
  control: "select" | "switch"
  badge?: PreferenceBadge
  options?: SelectOption[]
  defaultValue?: string
  defaultChecked?: boolean
}

export interface PreferenceSection {
  id: string
  title: string
  items: PreferenceItem[]
}

// ── Data ──

export const PREFERENCE_SECTIONS: PreferenceSection[] = [
  {
    id: "general",
    title: "General",
    items: [
      {
        id: "default-view",
        title: "Default view",
        description: "Choose which layout opens on launch.",
        control: "select",
        options: [
          { label: "Board", value: "board" },
          { label: "List", value: "list" },
          { label: "Timeline", value: "timeline" },
          { label: "Calendar", value: "calendar" },
        ],
        defaultValue: "board",
      },
      {
        id: "date-format",
        title: "Date format",
        description: "Set how dates appear across the app.",
        control: "select",
        options: [
          { label: "MM/DD/YYYY", value: "mm/dd/yyyy" },
          { label: "DD/MM/YYYY", value: "dd/mm/yyyy" },
          { label: "YYYY-MM-DD", value: "yyyy-mm-dd" },
        ],
        defaultValue: "mm/dd/yyyy",
      },
      {
        id: "week-start",
        title: "First day of week",
        description: "Used for calendars and date pickers.",
        control: "select",
        options: [
          { label: "Monday", value: "monday" },
          { label: "Sunday", value: "sunday" },
          { label: "Saturday", value: "saturday" },
          { label: "Friday", value: "friday" },
          { label: "Thursday", value: "thursday" },
          { label: "Wednesday", value: "wednesday" },
          { label: "Tuesday", value: "tuesday" },
        ],
        defaultValue: "monday",
      },
      {
        id: "auto-save",
        title: "Auto-save drafts",
        description: "Automatically save unsaved changes.",
        control: "switch",
        badge: {
          label: "Recommended",
          variant: "success-light",
        },
        defaultChecked: true,
      },
      {
        id: "rich-text",
        title: "Rich text editing",
        description: "Enable formatting toolbar in text fields.",
        control: "switch",
        badge: {
          label: "Editor",
          variant: "focus-light",
        },
        defaultChecked: true,
      },
    ],
  },
  {
    id: "display",
    title: "Display",
    items: [
      {
        id: "color-theme",
        title: "Color theme",
        description: "Choose your preferred color scheme.",
        control: "select",
        badge: {
          label: "Shared",
          variant: "info-light",
        },
        options: [
          { label: "System", value: "system" },
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ],
        defaultValue: "system",
      },
      {
        id: "sidebar-position",
        title: "Sidebar position",
        description: "Set the navigation sidebar placement.",
        control: "select",
        options: [
          { label: "Left", value: "left" },
          { label: "Right", value: "right" },
        ],
        defaultValue: "left",
      },
      {
        id: "reduce-motion",
        title: "Reduce animations",
        description: "Minimize motion for accessibility.",
        control: "switch",
        badge: {
          label: "Accessibility",
          variant: "warning-light",
        },
        defaultChecked: false,
      },
      {
        id: "show-tooltips",
        title: "Show tooltips",
        description: "Display helpful hints on hover.",
        control: "switch",
        defaultChecked: true,
      },
    ],
  },
]