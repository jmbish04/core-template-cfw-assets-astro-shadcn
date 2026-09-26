export interface NotificationItem {
  id: string
  label: string
  email: boolean
  slack: boolean
  inApp: boolean
}

export interface NotificationGroup {
  id: string
  title: string
  items: NotificationItem[]
}

export interface NotificationTab {
  id: string
  label: string
  groups: NotificationGroup[]
}

export const CHANNELS = ["Email", "Slack", "In-app"] as const

// ── Data ──

export const NOTIFICATION_TABS: NotificationTab[] = [
  {
    id: "projects",
    label: "Projects",
    groups: [
      {
        id: "task-activity",
        title: "Task activity",
        items: [
          {
            id: "task-assigned",
            label: "Task assigned to you",
            email: true,
            slack: false,
            inApp: true,
          },
          {
            id: "due-date",
            label: "Due date approaching",
            email: true,
            slack: false,
            inApp: false,
          },
          {
            id: "status-change",
            label: "Status changed",
            email: false,
            slack: false,
            inApp: true,
          },
          {
            id: "comment-mention",
            label: "Mentioned in a comment",
            email: true,
            slack: true,
            inApp: true,
          },
          {
            id: "file-upload",
            label: "File attachment added",
            email: false,
            slack: false,
            inApp: false,
          },
        ],
      },
      {
        id: "project-updates",
        title: "Project updates",
        items: [
          {
            id: "milestone",
            label: "Milestone completed",
            email: true,
            slack: false,
            inApp: true,
          },
          {
            id: "sprint-end",
            label: "Sprint ended",
            email: true,
            slack: false,
            inApp: false,
          },
          {
            id: "member-added",
            label: "New member added to project",
            email: false,
            slack: false,
            inApp: true,
          },
          {
            id: "archive",
            label: "Project archived",
            email: true,
            slack: false,
            inApp: false,
          },
        ],
      },
    ],
  },
  {
    id: "messages",
    label: "Messages",
    groups: [
      {
        id: "direct-messages",
        title: "Direct messages",
        items: [
          {
            id: "new-dm",
            label: "New direct message",
            email: false,
            slack: true,
            inApp: true,
          },
          {
            id: "dm-reaction",
            label: "Reaction to your message",
            email: false,
            slack: false,
            inApp: true,
          },
          {
            id: "dm-thread",
            label: "Thread reply",
            email: false,
            slack: true,
            inApp: true,
          },
        ],
      },
      {
        id: "channels",
        title: "Channel activity",
        items: [
          {
            id: "channel-mention",
            label: "Mentioned in channel",
            email: true,
            slack: true,
            inApp: true,
          },
          {
            id: "channel-join",
            label: "Added to a channel",
            email: false,
            slack: false,
            inApp: true,
          },
          {
            id: "channel-announcement",
            label: "New announcement posted",
            email: true,
            slack: false,
            inApp: true,
          },
        ],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    groups: [
      {
        id: "scheduled",
        title: "Scheduled reports",
        items: [
          {
            id: "weekly-summary",
            label: "Weekly activity summary",
            email: true,
            slack: false,
            inApp: false,
          },
          {
            id: "monthly-report",
            label: "Monthly performance report",
            email: true,
            slack: false,
            inApp: false,
          },
          {
            id: "usage-stats",
            label: "Usage statistics digest",
            email: false,
            slack: false,
            inApp: true,
          },
        ],
      },
    ],
  },
  {
    id: "system",
    label: "System",
    groups: [
      {
        id: "account",
        title: "Account activity",
        items: [
          {
            id: "login-alert",
            label: "New device login",
            email: true,
            slack: false,
            inApp: true,
          },
          {
            id: "password-change",
            label: "Password changed",
            email: true,
            slack: false,
            inApp: false,
          },
          {
            id: "api-key",
            label: "API key created or revoked",
            email: true,
            slack: false,
            inApp: true,
          },
          {
            id: "billing",
            label: "Billing and invoice updates",
            email: true,
            slack: false,
            inApp: false,
          },
        ],
      },
      {
        id: "maintenance",
        title: "Service updates",
        items: [
          {
            id: "downtime",
            label: "Scheduled maintenance",
            email: true,
            slack: true,
            inApp: true,
          },
          {
            id: "incident",
            label: "Incident notifications",
            email: true,
            slack: true,
            inApp: true,
          },
          {
            id: "changelog",
            label: "Product changelog",
            email: false,
            slack: false,
            inApp: true,
          },
        ],
      },
    ],
  },
]