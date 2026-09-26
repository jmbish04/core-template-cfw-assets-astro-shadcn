export interface SelectOption {
  label: string
  value: string | null
}

export type SecurityControl = "switch" | "select" | "badge"

export interface SecurityItem {
  id: string
  title: string
  description: string
  control: SecurityControl
  defaultChecked?: boolean
  badgeLabel?: string
  badgeColor?:
    | "info-light"
    | "success-light"
    | "warning-light"
    | "destructive-light"
  options?: SelectOption[]
  defaultValue?: string
}

export interface SecuritySection {
  id: string
  title: string
  description?: string
  items: SecurityItem[]
}

// ── Data ──

export const SECURITY_SECTIONS: SecuritySection[] = [
  {
    id: "session",
    title: "Session Policy",
    description:
      "Configure session duration and timeout rules for your workspace.",
    items: [
      {
        id: "enforce-2fa",
        title: "Enforce two-factor authentication",
        description: "Require all members to enable 2FA.",
        control: "switch",
        defaultChecked: false,
      },
      {
        id: "session-timeout",
        title: "Session timeout",
        description: "Auto-logout after inactivity period.",
        control: "select",
        options: [
          { label: "30 minutes", value: "30 minutes" },
          { label: "1 hour", value: "1 hour" },
          { label: "4 hours", value: "4 hours" },
          { label: "24 hours", value: "24 hours" },
          { label: "Never", value: "never" },
        ],
        defaultValue: "4 hours",
      },
      {
        id: "single-session",
        title: "Single active session",
        description: "Limit each user to one active session.",
        control: "switch",
        defaultChecked: false,
      },
    ],
  },
  {
    id: "login",
    title: "Login Methods",
    description:
      "Admins can always sign in via email. Changes apply to workspace members only.",
    items: [
      {
        id: "password-auth",
        title: "Password authentication",
        description: "Allow members to log in with a password.",
        control: "switch",
        defaultChecked: true,
      },
      {
        id: "magic-link",
        title: "Magic link login",
        description: "Send a one-time link via email to sign in.",
        control: "switch",
        defaultChecked: true,
      },
      {
        id: "saml-sso",
        title: "SAML single sign-on",
        description: "Authenticate via your identity provider.",
        control: "badge",
        badgeLabel: "Enterprise",
        badgeColor: "info-light",
      },
    ],
  },
  {
    id: "permissions",
    title: "Access Restrictions",
    description: "Control which plan features are available to your workspace.",
    items: [
      {
        id: "member-invites",
        title: "Member invitations",
        description: "Who can invite new members.",
        control: "badge",
        badgeLabel: "Basic",
        badgeColor: "success-light",
      },
      {
        id: "project-creation",
        title: "Project creation",
        description: "Who can create new projects.",
        control: "badge",
        badgeLabel: "Business",
        badgeColor: "warning-light",
      },
      {
        id: "custom-roles",
        title: "Custom roles",
        description: "Create and assign custom roles.",
        control: "badge",
        badgeLabel: "Business",
        badgeColor: "warning-light",
      },
      {
        id: "audit-log",
        title: "Audit log access",
        description: "View detailed workspace activity logs.",
        control: "badge",
        badgeLabel: "Enterprise",
        badgeColor: "info-light",
      },
    ],
  },
]