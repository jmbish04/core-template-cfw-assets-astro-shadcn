/**
 * @fileoverview SettingsNav — shared left sub-navigation for the settings area.
 *
 * Renders the five settings sections (Preferences / Notifications / Webhooks /
 * Activity / Advanced) as a vertical nav on desktop and a horizontal scroller
 * on mobile. Each entry is a plain anchor pointing at a static Astro route under
 * `/settings/*`, so the active section is derived from the current pathname at
 * render time (works for both SSR and the hydrated island).
 *
 * Rendered without a client directive — it has no state.
 */

import {
  ActivityIcon,
  BellIcon,
  type LucideIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  WebhookIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** A single settings section route. */
interface SettingsSection {
  /** Absolute route under /settings. */
  href: string;
  /** Display label. */
  label: string;
  /** One-line description (link title). */
  description: string;
  /** Lucide icon for the row. */
  icon: LucideIcon;
}

/**
 * The canonical settings section list. Order here is the order rendered in the
 * sub-nav and should match the page files under `src/frontend/pages/settings/`.
 */
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    href: "/settings/preferences",
    label: "Preferences",
    description: "Appearance, language & accessibility",
    icon: SlidersHorizontalIcon,
  },
  {
    href: "/settings/notifications",
    label: "Notifications",
    description: "Channel × category delivery matrix",
    icon: BellIcon,
  },
  {
    href: "/settings/webhooks",
    label: "Webhooks",
    description: "Outbound event subscriptions",
    icon: WebhookIcon,
  },
  {
    href: "/settings/activity",
    label: "Activity",
    description: "Audit trail of recent actions",
    icon: ActivityIcon,
  },
  {
    href: "/settings/advanced",
    label: "Advanced",
    description: "System info & danger zone",
    icon: SettingsIcon,
  },
] as const;

interface SettingsNavProps {
  /**
   * The currently active route, e.g. "/settings/preferences". Passed from the
   * Astro page (which knows it statically) so the island doesn't need to read
   * `window.location` before hydration.
   */
  active: string;
}

/**
 * Settings section rail. Static (no hydration needed): `active` comes from the
 * Astro page. Desktop: a vertical side-tab rail (ReUI profile-1 vertical Tabs
 * look). Mobile: a horizontal scroll rail with a line indicator (line Tabs).
 */
export function SettingsNav({ active }: SettingsNavProps) {
  return (
    <nav
      aria-label="Settings sections"
      className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 [scrollbar-width:none] md:mx-0 md:flex-col md:overflow-visible md:border-b-0 md:px-0"
    >
      {SETTINGS_SECTIONS.map((section) => {
        const isActive = active === section.href;
        const Icon = section.icon;
        return (
          <a
            key={section.href}
            href={section.href}
            aria-current={isActive ? "page" : undefined}
            data-active={isActive}
            title={section.description}
            className={cn(
              "relative flex h-9 shrink-0 items-center gap-2 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              "text-muted-foreground hover:text-foreground md:hover:bg-muted/60",
              "data-[active=true]:text-foreground md:data-[active=true]:bg-muted",
              // mobile line indicator under the active tab
              "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full data-[active=true]:after:bg-foreground md:after:hidden",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {section.label}
          </a>
        );
      })}
    </nav>
  );
}
