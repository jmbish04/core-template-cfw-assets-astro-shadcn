"use client"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { FEATURED_MAIL_ID, MAILS } from "./data"
import { ChevronLeftIcon, ChevronRightIcon, CornerUpLeftIcon, StarIcon, BookmarkIcon, Trash2Icon, MoreHorizontalIcon, MailIcon, BellOffIcon, ClockIcon, FolderIcon, TagIcon, PrinterIcon, AlertCircleIcon, UserRoundXIcon } from "lucide-react"

// ── App Header ──

interface AppHeaderProps {
  mailId?: string
}

export function AppHeader({ mailId }: AppHeaderProps) {
  const mail =
    MAILS.find((m) => m.id === mailId) ??
    MAILS.find((m) => m.id === FEATURED_MAIL_ID) ??
    MAILS[0]

  if (!mail) return null

  return (
    <header
      className={cn(
        "border-border flex h-(--header-height) min-w-0 shrink-0 items-center gap-1 border-b px-2 py-1.5",
        "sm:gap-1.5 sm:px-4"
      )}
    >
      {/* Sidebar */}
      <SidebarTrigger className="shrink-0 md:hidden" />

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous message"
        className="text-muted-foreground hidden shrink-0 sm:flex"
      >
        <ChevronLeftIcon aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next message"
        className="text-muted-foreground hidden shrink-0 sm:flex"
      >
        <ChevronRightIcon aria-hidden="true" />
      </Button>

      <div className="hidden items-center sm:flex">
        <Separator orientation="vertical" className="h-5" />
      </div>

      <h3 className="text-foreground w-0 flex-1 truncate text-sm leading-snug font-semibold">
        {mail.subject}
      </h3>

      {/* Actions */}
      <div
        role="toolbar"
        aria-label="Message actions"
        className="ml-auto flex shrink-0 items-center gap-0.5"
      >
        <Button
          variant="secondary"
          size="sm"
          aria-label="Reply all"
          className="hidden gap-1.5 sm:flex"
        >
          <CornerUpLeftIcon aria-hidden="true" />
          Reply all
        </Button>

        <div className="me-0.5 ml-2 hidden items-center sm:flex">
          <Separator orientation="vertical" className="h-5" />
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={mail.starred ? "Unstar message" : "Star message"}
        >
          <StarIcon aria-hidden="true" className={cn(
                                "shrink-0",
                                mail.starred
                                  ? "fill-amber-500 text-amber-500"
                                  : "text-muted-foreground"
                              )} />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Bookmark message"
          className="text-muted-foreground hidden shrink-0 md:flex"
        >
          <BookmarkIcon aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete message"
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2Icon aria-hidden="true" />
        </Button>

        <div className="mx-0.5 hidden items-center sm:flex">
          <Separator orientation="vertical" className="h-5" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="More options"
                className="text-muted-foreground shrink-0"
              />
            }
          >
            <MoreHorizontalIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <MailIcon aria-hidden="true" />
                  Mark as unread
                  <DropdownMenuShortcut>U</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BellOffIcon aria-hidden="true" />
                  Mute thread
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ClockIcon aria-hidden="true" />
                  Snooze
                  <DropdownMenuShortcut>S</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <FolderIcon aria-hidden="true" />
                  Move to folder
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <TagIcon aria-hidden="true" />
                  Add label
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <PrinterIcon aria-hidden="true" />
                  Print
                  <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive">
                  <AlertCircleIcon aria-hidden="true" />
                  Report spam
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <UserRoundXIcon aria-hidden="true" />
                  Block {mail.sender.name.split(" ")[0]}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}