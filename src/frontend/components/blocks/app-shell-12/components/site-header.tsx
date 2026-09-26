import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/ThemeToggle"
import { findNavTrail } from "@/lib/config"

import { NotificationsMenu } from "./notifications-menu"
import { SearchMenu } from "./search-menu"

export function SiteHeader({ activePath }: { activePath: string }) {
  const { group, item, child } = findNavTrail(activePath)
  const leaf = child && child.href !== item?.href ? child.label : item?.label
  return (
    <header className="bg-background sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Breadcrumb>
          <BreadcrumbList>
            {group && (
              <>
                <BreadcrumbItem className="hidden md:block">{group}</BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            )}
            {item && leaf !== item.label && (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{leaf ?? "Page"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="text-muted-foreground [&_button_svg]:text-muted-foreground [&_button:hover_svg]:text-foreground! [&_button[data-popup-open]_svg]:text-foreground! ml-auto flex items-center gap-1">
        <SearchMenu />
        <NotificationsMenu />
        <ThemeToggle />
      </div>
    </header>
  )
}
