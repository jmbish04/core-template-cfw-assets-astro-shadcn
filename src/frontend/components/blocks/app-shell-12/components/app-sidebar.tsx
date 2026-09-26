import { cn } from "@/lib/utils"

import { Separator } from "@/components/ui/separator"
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  Sidebar as SidebarRoot,
  useSidebar,
} from "@/components/ui/sidebar"

import { Brand } from "./brand"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"

function SidebarRailToggle() {
  const { state, toggleSidebar } = useSidebar()
  const isExpanded = state === "expanded"

  return (
    <button
      type="button"
      aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      onClick={toggleSidebar}
      style={{
        left: isExpanded ? "var(--sidebar-width)" : "var(--sidebar-width-icon)",
      }}
      className={cn(
        "group/rail fixed top-1/2 z-30 flex h-12 w-7 -translate-y-1/2 cursor-pointer items-center pl-2 outline-none",
        "transition-[left] duration-200 ease-linear"
      )}
    >
      <span className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className={cn(
            "bg-foreground/40 block h-2 w-0.5 rounded-t-full",
            "origin-bottom transition-all duration-100 ease-linear",
            isExpanded
              ? "group-hover/rail:bg-foreground/60 group-hover/rail:rotate-40"
              : "group-hover/rail:bg-foreground/60 group-hover/rail:-rotate-40"
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "bg-foreground/40 block h-2 w-0.5 rounded-b-full",
            "origin-top transition-all duration-100 ease-linear",
            isExpanded
              ? "group-hover/rail:bg-foreground/60 group-hover/rail:-rotate-40"
              : "group-hover/rail:bg-foreground/60 group-hover/rail:rotate-40"
          )}
        />
      </span>

      <span
        className={cn(
          "border-border bg-foreground text-background absolute left-full -ml-2 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-xs shadow-black/5",
          "pointer-events-none transition-all duration-200 ease-out",
          "-translate-x-0.5 opacity-0",
          "group-hover/rail:translate-x-0 group-hover/rail:opacity-100"
        )}
      >
        {isExpanded ? "Collapse" : "Expand"}
      </span>
    </button>
  )
}

export function AppSidebar({ activePath }: { activePath: string }) {
  return (
    <SidebarRoot collapsible="icon">
      <SidebarHeader className="pb-0">
        <Brand />
      </SidebarHeader>

      <SidebarContent>
        <NavMain activePath={activePath} />
      </SidebarContent>

      <SidebarFooter className="px-1! in-data-[state=collapsed]:px-1!">
        <div className="px-2">
          <Separator />
        </div>
        <NavSecondary activePath={activePath} />
      </SidebarFooter>

      <SidebarRailToggle />
    </SidebarRoot>
  )
}