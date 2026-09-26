import { CloudIcon } from "lucide-react"

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { siteConfig } from "@/lib/config"

export function Brand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          render={<a href="/" aria-label={`${siteConfig.name} home`} />}
          className="gap-2.5"
        >
          <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
            <CloudIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate text-sm font-semibold">{siteConfig.shortName}</span>
            <span className="text-muted-foreground truncate text-xs">Workers · Astro · ReUI</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
