import { useState } from "react"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { findNavTrail, isActiveHref, navGroups, type NavChild, type NavItem } from "@/lib/config"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

type ParentItem = NavItem & { children: NavChild[] }

// Collapsed (icon) rail: children open in a side dropdown anchored to the icon.
function CollapsedNavItem({ item, active, activeChild }: { item: ParentItem; active: boolean; activeChild?: string }) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<SidebarMenuButton tooltip={item.label} isActive={active} aria-label={item.label} />}
        >
          <item.icon aria-hidden="true" />
          <span>{item.label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={8} className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
            {item.children.map((child) => (
              <DropdownMenuItem
                key={child.href}
                render={<a href={child.href} aria-current={activeChild === child.href ? "page" : undefined} />}
              >
                {child.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

// Expanded rail: the submenu expands inline under its parent button.
function ExpandedNavItem({
  item,
  active,
  activeChild,
}: {
  item: ParentItem
  active: boolean
  activeChild?: string
}) {
  const [open, setOpen] = useState(active)
  const id = `subnav-${item.label.toLowerCase()}`
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.label}
        isActive={active}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
      >
        <item.icon aria-hidden="true" />
        <span>{item.label}</span>
        <ChevronRightIcon
          className={cn("ml-auto size-4 shrink-0 opacity-60 transition-transform duration-200", open && "rotate-90")}
          aria-hidden="true"
        />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub id={id}>
          {item.children.map((child) => {
            const on = activeChild === child.href
            return (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton
                  render={<a href={child.href} aria-current={on ? "page" : undefined} />}
                  isActive={on}
                >
                  <span>{child.label}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

function ParentNavItem(props: { item: ParentItem; active: boolean; activeChild?: string }) {
  const { state, isMobile } = useSidebar()
  return state === "collapsed" && !isMobile ? <CollapsedNavItem {...props} /> : <ExpandedNavItem {...props} />
}

function LeafNavItem({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.label}
        isActive={active}
        render={<a href={item.href} aria-current={active ? "page" : undefined} />}
      >
        <item.icon aria-hidden="true" />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function NavMain({ activePath }: { activePath: string }) {
  // One active item: the most specific match wins (design-system rule).
  const trail = findNavTrail(activePath)
  return (
    <>
      {navGroups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.25">
              {group.items.map((item) => {
                const active = trail.item === item || (!trail.item && isActiveHref(activePath, item.href))
                return item.children ? (
                  <ParentNavItem
                    key={item.label}
                    item={item as ParentItem}
                    active={active}
                    activeChild={active ? trail.child?.href : undefined}
                  />
                ) : (
                  <LeafNavItem key={item.label} item={item} active={active} />
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
