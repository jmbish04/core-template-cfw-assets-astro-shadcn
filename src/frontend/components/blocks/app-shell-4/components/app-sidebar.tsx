"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { NAV_FOLDERS } from "./data"
import { Logo } from "./logo"
import { MailList } from "./mail-list"
import { NavUser } from "./nav-user"

// ── Sidebar Rail Toggle ──

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
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1",
        "focus-visible:rounded-sm",
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
          "border-border bg-foreground text-background absolute left-full -ml-2 border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-xs shadow-black/5",
          "rounded-md",
          "pointer-events-none -translate-x-0.5 opacity-0 transition-all duration-200 ease-out",
          "group-hover/rail:translate-x-0 group-hover/rail:opacity-100"
        )}
      >
        {isExpanded ? "Collapse" : "Expand"}
      </span>
    </button>
  )
}

// ── App Sidebar ──

interface AppSidebarProps {
  selectedMailId?: string
  onSelectMail?: (id: string) => void
}

export function AppSidebar({ selectedMailId, onSelectMail }: AppSidebarProps) {
  const { isMobile, setOpen } = useSidebar()
  const [activeFolderId, setActiveFolderId] = useState("inbox")

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
    >
      <div className="flex min-h-full">
        {/* ── First inner sidebar: icon navigation rail ── */}
        <Sidebar
          collapsible="none"
          className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
        >
          {/* Logo */}
          <SidebarHeader className="flex items-center justify-center py-3">
            <Logo />
          </SidebarHeader>

          {/* Folder nav */}
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {NAV_FOLDERS.map((folder) => (
                    <SidebarMenuItem key={folder.id}>
                      <SidebarMenuButton
                        className="justify-center!"
                        tooltip={{ children: folder.label, hidden: false }}
                        isActive={activeFolderId === folder.id}
                        onClick={() => {
                          setActiveFolderId(folder.id)
                          setOpen(true)
                        }}
                      >
                        {folder.icon}
                        {folder.count !== undefined && folder.count > 0 && (
                          <span
                            className="bg-primary absolute top-0.5 right-0.5 size-1.5 rounded-full"
                            aria-hidden="true"
                          />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Footer: settings + user */}
          <SidebarFooter>
            <NavUser />
          </SidebarFooter>
        </Sidebar>

        {/* ── Second inner sidebar: mail list ── */}
        <MailList
          hidden={false}
          selectedId={selectedMailId}
          onSelect={onSelectMail}
        />
      </div>

      {!isMobile && <SidebarRailToggle />}
    </Sidebar>
  )
}