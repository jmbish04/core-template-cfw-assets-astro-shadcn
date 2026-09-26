import { useState, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { FEATURED_MAIL_ID } from "./data"

export function AppShell() {
  const [selectedMailId, setSelectedMailId] = useState(FEATURED_MAIL_ID)

  return (
    <SidebarProvider
      className={cn(
        "h-screen",
        "[--sidebar-accent:color-mix(in_oklab,var(--color-primary)_5%,transparent)]",
        "[--sidebar-accent-foreground:var(--color-primary)]"
      )}
      style={
        {
          "--sidebar-width": "440px",
          "--header-height": "50px",
        } as CSSProperties
      }
    >
      {/* Sidebar */}
      <AppSidebar
        selectedMailId={selectedMailId}
        onSelectMail={setSelectedMailId}
      />

      <SidebarInset>
        <AppHeader mailId={selectedMailId} />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="border-border/40 bg-muted/40 aspect-video rounded-lg border border-dashed" />
            <div className="border-border/40 bg-muted/40 aspect-video rounded-lg border border-dashed" />
            <div className="border-border/40 bg-muted/40 aspect-video rounded-lg border border-dashed" />
          </div>
          <div className="border-border/40 bg-muted/40 min-h-[1000px] flex-1 rounded-lg border border-dashed" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}