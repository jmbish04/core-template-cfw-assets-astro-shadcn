import { type ReactNode } from "react"
import { type BadgeProps } from "@/components/reui/badge"
import { CircleIcon, CircleDotIcon, ClockIcon, MessageSquareIcon, CircleCheckIcon, ShieldCheckIcon } from "lucide-react"

export type BugSignal = "Blocked" | "At risk" | "On track" | "Queued"
export type BugPriority = "P0" | "P1" | "P2" | "P3"

export interface BugTask {
  id: string
  taskKey: string
  title: string
  label: string
  labelVariant: BadgeProps["variant"]
  signal: BugSignal
  priority: BugPriority
  owner: string
  ownerInitials: string
  ownerAvatar: string
  dueLabel: string
  completionRate: number | null
}

export interface BugColumn {
  id: string
  title: string
  description: string
  surfaceClassName: string
  borderClassName: string
  accentClassName: string
  indicatorClassName: string
  addClassName: string
  icon: ReactNode
}

export const BOARD_TITLE = "Issue Tracking"
export const BOARD_DESCRIPTION = "Track ownership, severity, and release risk."

export const BOARD_COLUMNS: Record<string, BugColumn> = {
  open: {
    id: "open",
    title: "1. Open",
    description: "New reports",
    surfaceClassName: "bg-muted/25 dark:bg-muted/10",
    borderClassName: "border-border",
    accentClassName: "bg-muted-foreground/70",
    indicatorClassName: "text-muted-foreground",
    addClassName: "hover:border-muted-foreground/40 hover:bg-muted/35",
    icon: (
      <CircleIcon aria-hidden="true" />
    ),
  },
  triage: {
    id: "triage",
    title: "2. Triage",
    description: "Needs owner",
    surfaceClassName: "bg-warning/[0.045] dark:bg-warning/10",
    borderClassName: "border-warning/20 dark:border-warning/25",
    accentClassName: "bg-warning",
    indicatorClassName: "text-warning-foreground",
    addClassName: "hover:border-warning/35 hover:bg-warning/[0.06]",
    icon: (
      <CircleDotIcon aria-hidden="true" />
    ),
  },
  inProgress: {
    id: "inProgress",
    title: "3. In Progress",
    description: "Being fixed",
    surfaceClassName: "bg-primary/[0.045] dark:bg-primary/10",
    borderClassName: "border-primary/20 dark:border-primary/25",
    accentClassName: "bg-primary",
    indicatorClassName: "text-primary",
    addClassName: "hover:border-primary/35 hover:bg-primary/[0.06]",
    icon: (
      <ClockIcon aria-hidden="true" />
    ),
  },
  needsInfo: {
    id: "needsInfo",
    title: "4. Need Info",
    description: "Waiting on detail",
    surfaceClassName: "bg-destructive/[0.045] dark:bg-destructive/10",
    borderClassName: "border-destructive/20 dark:border-destructive/25",
    accentClassName: "bg-destructive",
    indicatorClassName: "text-destructive",
    addClassName: "hover:border-destructive/35 hover:bg-destructive/[0.06]",
    icon: (
      <MessageSquareIcon aria-hidden="true" />
    ),
  },
  testing: {
    id: "testing",
    title: "5. Testing",
    description: "Verifying fix",
    surfaceClassName: "bg-info/[0.045] dark:bg-info/10",
    borderClassName: "border-info/20 dark:border-info/25",
    accentClassName: "bg-info",
    indicatorClassName: "text-info-foreground",
    addClassName: "hover:border-info/35 hover:bg-info/[0.06]",
    icon: (
      <CircleCheckIcon aria-hidden="true" />
    ),
  },
  cannotReproduce: {
    id: "cannotReproduce",
    title: "6. Done",
    description: "Closed",
    surfaceClassName: "bg-success/[0.045] dark:bg-success/10",
    borderClassName: "border-success/20 dark:border-success/25",
    accentClassName: "bg-success",
    indicatorClassName: "text-success-foreground",
    addClassName: "hover:border-success/35 hover:bg-success/[0.06]",
    icon: (
      <ShieldCheckIcon aria-hidden="true" />
    ),
  },
}

export const INITIAL_BUG_COLUMNS: Record<string, BugTask[]> = {
  open: [
    {
      id: "bug-101",
      taskKey: "BUG-421",
      title: "User permissions block account switching",
      label: "Access",
      labelVariant: "primary-light",
      signal: "Queued",
      priority: "P1",
      owner: "Nora Lee",
      ownerInitials: "NL",
      ownerAvatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
      dueLabel: "Today",
      completionRate: 12,
    },
    {
      id: "bug-102",
      title: "Forms submit duplicate confirmation emails",
      taskKey: "BUG-426",
      label: "Forms",
      labelVariant: "destructive-light",
      signal: "At risk",
      priority: "P2",
      owner: "Omar Vale",
      ownerInitials: "OV",
      ownerAvatar:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
      dueLabel: "Apr 26",
      completionRate: 26,
    },
  ],
  triage: [
    {
      id: "bug-201",
      taskKey: "BUG-438",
      title: "Login button does not redirect from invite links",
      label: "Auth",
      labelVariant: "destructive-light",
      signal: "Blocked",
      priority: "P0",
      owner: "Mia Hart",
      ownerInitials: "MH",
      ownerAvatar:
        "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
      dueLabel: "Today",
      completionRate: 8,
    },
    {
      id: "bug-202",
      taskKey: "BUG-445",
      title: "API integration returns incorrect totals",
      label: "API",
      labelVariant: "warning-light",
      signal: "At risk",
      priority: "P1",
      owner: "Eli Stone",
      ownerInitials: "ES",
      ownerAvatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
      dueLabel: "Apr 25",
      completionRate: 42,
    },
    {
      id: "bug-203",
      taskKey: "BUG-449",
      title: "Import wizard skips validation errors",
      label: "Import",
      labelVariant: "warning-light",
      signal: "At risk",
      priority: "P1",
      owner: "Ari Blake",
      ownerInitials: "AB",
      ownerAvatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=96&h=96&dpr=2&q=80",
      dueLabel: "Apr 26",
      completionRate: 31,
    },
  ],
  inProgress: [
    {
      id: "bug-301",
      taskKey: "BUG-452",
      title: "Button text truncates when zoomed in",
      label: "UI",
      labelVariant: "primary-light",
      signal: "On track",
      priority: "P2",
      owner: "Kai Chen",
      ownerInitials: "KC",
      ownerAvatar:
        "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=96&h=96&dpr=2&q=80",
      dueLabel: "Apr 27",
      completionRate: 58,
    },
    {
      id: "bug-302",
      taskKey: "BUG-459",
      title: "Navigation menu renders inconsistent font sizes",
      label: "Nav",
      labelVariant: "focus-light",
      signal: "On track",
      priority: "P2",
      owner: "Rae Kim",
      ownerInitials: "RK",
      ownerAvatar:
        "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=96&h=96&dpr=2&q=80",
      dueLabel: "Apr 29",
      completionRate: 66,
    },
  ],
  needsInfo: [
    {
      id: "bug-401",
      taskKey: "BUG-467",
      title: "Mobile app crashes when opening report history",
      label: "Mobile",
      labelVariant: "destructive-light",
      signal: "Blocked",
      priority: "P0",
      owner: "Lina Ford",
      ownerInitials: "LF",
      ownerAvatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
      dueLabel: "Waiting",
      completionRate: null,
    },
    {
      id: "bug-402",
      taskKey: "BUG-472",
      title: "Data export creates broken report links",
      label: "Export",
      labelVariant: "warning-light",
      signal: "At risk",
      priority: "P1",
      owner: "Theo West",
      ownerInitials: "TW",
      ownerAvatar:
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=96&h=96&dpr=2&q=80",
      dueLabel: "Apr 28",
      completionRate: 34,
    },
    {
      id: "bug-403",
      taskKey: "BUG-475",
      title: "CSV upload fails for localized number formats",
      label: "CSV",
      labelVariant: "warning-light",
      signal: "Blocked",
      priority: "P1",
      owner: "Tara Quinn",
      ownerInitials: "TQ",
      ownerAvatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&dpr=2&q=80",
      dueLabel: "Waiting",
      completionRate: null,
    },
  ],
  testing: [
    {
      id: "bug-501",
      taskKey: "BUG-486",
      title: "Mobile app is not syncing with web app",
      label: "Sync",
      labelVariant: "info-light",
      signal: "On track",
      priority: "P1",
      owner: "Iris Fox",
      ownerInitials: "IF",
      ownerAvatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
      dueLabel: "Today",
      completionRate: 82,
    },
    {
      id: "bug-502",
      taskKey: "BUG-488",
      title: "Regression suite misses billing plan changes",
      label: "Billing",
      labelVariant: "primary-light",
      signal: "On track",
      priority: "P2",
      owner: "Sam Reed",
      ownerInitials: "SR",
      ownerAvatar:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=96&h=96&dpr=2&q=80",
      dueLabel: "Apr 26",
      completionRate: 74,
    },
  ],
  cannotReproduce: [
    {
      id: "bug-601",
      taskKey: "BUG-490",
      title: "Setup regression checklist before release",
      label: "QA",
      labelVariant: "success-light",
      signal: "On track",
      priority: "P3",
      owner: "Milo Sage",
      ownerInitials: "MS",
      ownerAvatar:
        "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=96&h=96&dpr=2&q=80",
      dueLabel: "Apr 23",
      completionRate: 100,
    },
    {
      id: "bug-602",
      taskKey: "BUG-492",
      title: "Archive stale browser compatibility notes",
      label: "Docs",
      labelVariant: "success-light",
      signal: "On track",
      priority: "P3",
      owner: "Dina Cruz",
      ownerInitials: "DC",
      ownerAvatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=96&h=96&dpr=2&q=80",
      dueLabel: "Apr 24",
      completionRate: 100,
    },
  ],
}