import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { devLinks, isActiveHref } from "@/lib/config"

/** Shell contract: /docs, /openapi.json, /scalar, /swagger — one click from anywhere. */
export function NavSecondary({ activePath }: { activePath: string }) {
  return (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel>API &amp; docs</SidebarGroupLabel>
      <SidebarMenu>
        {devLinks.map((item) => {
          const active = isActiveHref(activePath, item.href)
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                size="sm"
                tooltip={item.label}
                isActive={active}
                render={<a href={item.href} aria-current={active ? "page" : undefined} />}
                className="text-muted-foreground h-8! font-mono text-xs in-data-[state=collapsed]:h-8! [&_svg]:size-3.5"
              >
                <item.icon aria-hidden="true" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
