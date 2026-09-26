import { type ReactNode } from "react"
import { type BadgeProps } from "@/components/reui/badge"
import { InboxIcon, StarIcon, SendIcon, FileTextIcon, ArchiveIcon, ShieldAlertIcon, Trash2Icon } from "lucide-react"

// ── Types ──

export type MailNavFolder = {
  id: string
  label: string
  icon: ReactNode
  count?: number
}

export type MailTag = {
  label: string
  value: string
  color?: string
}

export type MailAvatarMember = {
  src?: string
  fallback: string
  color: string
}

export type MailAttachment = {
  name: string
  size: string
}

export type MailAction = {
  label: string
  variant?: "outline" | "default"
}

export type MailSender = {
  name: string
  email: string
  initials: string
  avatarColor: string
  avatarUrl?: string
}

export type Mail = {
  id: string
  sender: MailSender
  subject: string
  preview: string
  body?: string
  time: string
  unread: boolean
  starred?: boolean
  priority?: "high"
  label?: string
  labelVariant?: BadgeProps["variant"]
  tags?: MailTag[]
  avatarGroup?: MailAvatarMember[]
  attachment?: MailAttachment
  actions?: MailAction[]
}

// ── User ──

export const USER = {
  name: "Nick Bold",
  email: "nick@reui.io",
  initials: "NB",
  avatar:
    "https://images.unsplash.com/photo-1543299750-19d1d6297053?w=96&h=96&dpr=2&q=80",
} as const

// ── Nav Folders ──

export const NAV_FOLDERS: MailNavFolder[] = [
  {
    id: "inbox",
    label: "Inbox",
    icon: (
      <InboxIcon aria-hidden="true" />
    ),
    count: 4,
  },
  {
    id: "starred",
    label: "Starred",
    icon: (
      <StarIcon aria-hidden="true" />
    ),
  },
  {
    id: "sent",
    label: "Sent",
    icon: (
      <SendIcon aria-hidden="true" />
    ),
  },
  {
    id: "drafts",
    label: "Drafts",
    icon: (
      <FileTextIcon aria-hidden="true" />
    ),
  },
  {
    id: "archive",
    label: "Archive",
    icon: (
      <ArchiveIcon aria-hidden="true" />
    ),
  },
  {
    id: "spam",
    label: "Spam",
    icon: (
      <ShieldAlertIcon aria-hidden="true" />
    ),
  },
  {
    id: "trash",
    label: "Trash",
    icon: (
      <Trash2Icon aria-hidden="true" />
    ),
  },
]

// ── Mail Data ──

export const MAILS: Mail[] = [
  {
    id: "m1",
    sender: {
      name: "Sarah Chen",
      email: "sarah@designco.io",
      initials: "SC",
      avatarColor: "bg-violet-500",
      avatarUrl:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=96&h=96&dpr=2&q=80",
    },
    subject: "Design review · component library v2.0",
    preview:
      "Hey Nick, I've gone through the latest Figma handoff and left detailed comments on the spacing tokens. The button hierarchy looks great but we should revisit the hover states...",
    body: `Hi Nick,

I've gone through the latest Figma handoff and left detailed comments on the spacing tokens. The button hierarchy looks great, but I think we should revisit the hover states for secondary actions.

A few things I noticed:

1. The muted hover background might be too subtle on dark backgrounds
2. The icon-only buttons need larger hit areas for accessibility
3. The form inputs look excellent, really consistent across all variants

Overall, this is the best design system work I've seen from the team. Really proud of what we've built together this year.

Let's sync Thursday at 2 PM to walk through the full feedback together.

Best,
Sarah`,
    time: "10:42 AM",
    unread: true,
    starred: true,
    priority: "high",
    label: "Design",
    labelVariant: "primary-light",
    avatarGroup: [
      {
        fallback: "ML",
        color: "bg-emerald-500",
        src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
      },
      {
        fallback: "EW",
        color: "bg-rose-500",
        src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
      },
      {
        fallback: "JK",
        color: "bg-teal-500",
        src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&dpr=2&q=80",
      },
    ],
  },
  {
    id: "m2",
    sender: {
      name: "Marcus Lee",
      email: "marcus@company.io",
      initials: "ML",
      avatarColor: "bg-emerald-500",
      avatarUrl:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
    },
    subject: "Q4 Sprint planning, your input needed",
    preview:
      "Hey team, sharing the draft sprint board for Q4. We have 3 major milestones: the public launch of ReUI Pro, the icon pack update, and onboarding improvements...",
    time: "9:15 AM",
    unread: true,
    label: "Work",
    labelVariant: "info-light",
    attachment: { name: "Q4-Sprint-Board.pdf", size: "1.2 MB" },
  },
  {
    id: "m3",
    sender: {
      name: "Emma Wilson",
      email: "emma@startup.dev",
      initials: "EW",
      avatarColor: "bg-rose-500",
      avatarUrl:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
    },
    subject: "Partnership proposal · ReUI integration",
    preview:
      "Hi Nick, reaching out because we've been using ReUI for 6 months and it's transformed our design workflow. We'd love to explore a formal partnership...",
    time: "Yesterday",
    unread: true,
    label: "Business",
    labelVariant: "warning-light",
    actions: [
      { label: "Schedule Call" },
      { label: "View Proposal", variant: "outline" },
    ],
  },
  {
    // tags only - automated security notification
    id: "m4",
    sender: {
      name: "GitHub",
      email: "noreply@github.com",
      initials: "GH",
      avatarColor: "bg-neutral-700",
      avatarUrl: "https://github.com/github.png",
    },
    subject:
      "[keenthemes] Security advisory on rollup affects your repositories",
    preview:
      "A security advisory on rollup affects at least one of your repositories. reui/core · keenthemes/GHSA-mw96-cpmx-2vgc · +1 other",
    time: "Yesterday",
    unread: false,
    tags: [
      { label: "repo", value: "reui/core" },
      { label: "type", value: "security", color: "text-destructive" },
    ],
  },
  {
    id: "m5",
    sender: {
      name: "Stripe",
      email: "noreply@stripe.com",
      initials: "ST",
      avatarColor: "bg-blue-600",
    },
    subject: "Payment received · $299 from Acme Corp",
    preview:
      "A payment of $299.00 has been received from Acme Corp on November 28, 2024. Your current balance is $1,248.00. View your dashboard for full details...",
    time: "Mon",
    unread: false,
    label: "Finance",
    labelVariant: "success-light",
  },
  {
    // attachment + tag - invoice with reference number
    id: "m6",
    sender: {
      name: "Alex Martin",
      email: "alex@agency.co",
      initials: "AM",
      avatarColor: "bg-amber-500",
      avatarUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    },
    subject: "Invoice #1024 · November services",
    preview:
      "Please find attached the invoice for November consulting services. Total: $2,400.00. Payment due December 15th. Thank you for the continued partnership...",
    time: "Mon",
    unread: false,
    attachment: { name: "Invoice-1024.pdf", size: "243 KB" },
    tags: [{ label: "#", value: "1024", color: "text-warning" }],
  },
  {
    // tags only - automated CI/CD status
    id: "m7",
    sender: {
      name: "Vercel",
      email: "noreply@vercel.com",
      initials: "VC",
      avatarColor: "bg-neutral-900",
      avatarUrl: "https://github.com/vercel.png",
    },
    subject: "✓ Deployment successful · reui.io/pro",
    preview:
      "Your latest deployment to production is live. Build time: 47s. All checks passed. Deployment ID: dpl_AbC123xyz...",
    time: "Sun",
    unread: false,
    tags: [
      { label: "env", value: "production", color: "text-success" },
      { label: "build", value: "47s", color: "text-primary" },
    ],
  },
  {
    // bare - personal email, no extras needed
    id: "m8",
    sender: {
      name: "Jessica Brooks",
      email: "jessica@example.com",
      initials: "JB",
      avatarColor: "bg-pink-500",
      avatarUrl:
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=96&h=96&dpr=2&q=80",
    },
    subject: "Following up on your Config 2024 talk",
    preview:
      "Hi Nick! I attended your talk and was blown away by the design system workflow. I'd love to chat about how you manage component tokens across themes...",
    time: "Nov 22",
    unread: true,
    starred: true,
    priority: "high",
  },
  {
    id: "m9",
    sender: {
      name: "Linear",
      email: "noreply@linear.app",
      initials: "LN",
      avatarColor: "bg-indigo-600",
    },
    subject: "Sprint review: 18 issues closed this week",
    preview:
      "Great work this sprint. Your team closed 18 issues, moved 5 to In Review, and created 8 new ones. Top contributors: Nick Bold (6), Sarah Chen (5)...",
    time: "Nov 21",
    unread: false,
    avatarGroup: [
      { fallback: "NB", color: "bg-primary" },
      {
        fallback: "SC",
        color: "bg-violet-500",
        src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
      },
      {
        fallback: "ML",
        color: "bg-emerald-500",
        src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
      },
      {
        fallback: "JK",
        color: "bg-teal-500",
        src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&dpr=2&q=80",
      },
    ],
  },
  {
    id: "m10",
    sender: {
      name: "James Kim",
      email: "james@events.io",
      initials: "JK",
      avatarColor: "bg-teal-500",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&dpr=2&q=80",
    },
    subject: "Figma Config 2025 · Speaker confirmation",
    preview:
      "Congratulations! We're thrilled to confirm your spot as a speaker at Figma Config 2025. Your talk 'Production-Ready Design Systems' has been approved...",
    time: "Nov 20",
    unread: false,
    starred: true,
    label: "Events",
    labelVariant: "focus-light",
    actions: [{ label: "Confirm Attendance" }],
  },
]

export const FEATURED_MAIL_ID = "m1"