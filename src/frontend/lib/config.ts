/**
 * @fileoverview Site identity + the app-shell navigation (ReUI app-shell-12).
 *
 * This is the single source of truth for the sidebar, the ⌘K search palette and
 * the header breadcrumb. Nav is at most two levels (design-system rule: a third
 * level is a page, not a nav item). The API & docs links are the shell contract
 * and always render at the foot of the rail.
 */
import {
  BellIcon,
  BookOpenIcon,
  BracesIcon,
  ChartColumnIcon,
  FlaskConicalIcon,
  FolderKanbanIcon,
  HouseIcon,
  InboxIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MessagesSquareIcon,
  NotebookPenIcon,
  SettingsIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

export type NavChild = { href: string; label: string };

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Second level. The parent href is the section landing page. */
  children?: NavChild[];
};

export type NavGroup = { label: string; items: NavItem[] };

export const siteConfig = {
  name: "Cloudflare Edge Showcase",
  shortName: "Edge Showcase",
  description:
    "Cloudflare Worker template: Astro + React on ReUI, D1 via Hono, AI chat through the core-guardian service binding",
  url: "https://example.com",
  links: { github: "https://github.com/jmbish04/core-template-cfw-assets-astro-shadcn" },
};

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", icon: HouseIcon },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
      { href: "/analytics", label: "Analytics", icon: ChartColumnIcon },
      { href: "/projects", label: "Projects", icon: FolderKanbanIcon },
      {
        href: "/tasks",
        label: "Tasks",
        icon: ListChecksIcon,
        children: [
          { href: "/tasks", label: "All tasks" },
          { href: "/tasks/board", label: "Board" },
        ],
      },
      { href: "/notes", label: "Notes", icon: NotebookPenIcon },
      { href: "/inbox", label: "Inbox", icon: InboxIcon },
    ],
  },
  {
    label: "AI",
    items: [{ href: "/chat", label: "Chat", icon: MessagesSquareIcon }],
  },
  {
    label: "System",
    items: [
      { href: "/notifications", label: "Notifications", icon: BellIcon },
      {
        href: "/settings",
        label: "Settings",
        icon: SettingsIcon,
        children: [
          { href: "/settings/preferences", label: "Preferences" },
          { href: "/settings/notifications", label: "Notifications" },
          { href: "/settings/webhooks", label: "Webhooks" },
          { href: "/settings/activity", label: "Activity" },
          { href: "/settings/advanced", label: "Advanced" },
        ],
      },
      { href: "/showcase/utilities", label: "Data utilities", icon: FlaskConicalIcon },
      { href: "/playbook", label: "Playbook", icon: WrenchIcon },
    ],
  },
];

/** Shell contract: always at the foot of the rail, never behind a footer. */
export const devLinks: NavItem[] = [
  { href: "/docs", label: "Docs", icon: BookOpenIcon },
  { href: "/openapi.json", label: "openapi.json", icon: BracesIcon },
  { href: "/scalar", label: "Scalar", icon: BracesIcon },
  { href: "/swagger", label: "Swagger", icon: BracesIcon },
];

const clean = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

/** Exact match, or a section prefix match ("/tasks/abc" lights "/tasks"). "/" is exact only. */
export function isActiveHref(path: string, href: string): boolean {
  const p = clean(path);
  if (href === "/") return p === "/";
  return p === href || p.startsWith(`${href}/`);
}

/**
 * Most specific nav entry for a path — used for the breadcrumb.
 * Returns [section item, child?].
 */
export function findNavTrail(path: string): { group?: string; item?: NavItem; child?: NavChild } {
  let best: { group?: string; item?: NavItem; child?: NavChild; len: number } = { len: -1 };
  for (const g of navGroups) {
    for (const item of [...g.items]) {
      for (const c of item.children ?? []) {
        if (isActiveHref(path, c.href) && c.href.length > best.len) best = { group: g.label, item, child: c, len: c.href.length };
      }
      if (isActiveHref(path, item.href) && item.href.length > best.len) best = { group: g.label, item, len: item.href.length };
    }
  }
  return best;
}
