/**
 * @fileoverview App shell — ReUI block `app-shell-12`, adapted.
 *
 * One hydrated island holds the whole shell (rail + header) so they share state.
 * Page content arrives as Astro slot children and keeps its own islands.
 * Taken from the block: icon-collapsible Sidebar, rail toggle, ⌘K search,
 * notifications popover. Stripped: workspace/projects rings, apps grid, user
 * menu (no users here — the theme toggle moved to the header).
 */
import { type CSSProperties, type ReactNode } from "react";
import { Toaster } from "sonner";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { AppSidebar } from "./app-sidebar";
import { SiteHeader } from "./site-header";

export function AppShell({
  activePath,
  defaultOpen = true,
  children,
}: {
  activePath: string;
  /** From the `sidebar_state` cookie, so collapse is applied before first paint. */
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        className={cn(
          "[--sidebar:color-mix(in_oklab,var(--color-sidebar)_60%,transparent)]",
          "[--sidebar-border:transparent]",
          "[--sidebar-accent:color-mix(in_oklab,var(--color-primary)_5%,transparent)]",
          "[--sidebar-accent-foreground:var(--color-primary)]",
        )}
        style={{ "--sidebar-width": "240px" } as CSSProperties}
      >
        <AppSidebar activePath={activePath} />
        <SidebarInset className="min-w-0">
          <SiteHeader activePath={activePath} />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
      {/* sonner host for block toasts; theme follows the html.dark class via tokens */}
      <Toaster position="bottom-right" toastOptions={{ className: "!bg-popover !text-popover-foreground !border-border" }} />
    </TooltipProvider>
  );
}
