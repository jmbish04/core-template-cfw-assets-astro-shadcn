import { useState } from "react"
import { Badge } from "@/components/reui/badge"
import { cn } from "@/lib/utils"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FEATURED_MAIL_ID, MAILS, type Mail, type MailTag } from "./data"
import { StarIcon, PaperclipIcon, DownloadIcon, RefreshCwIcon, FilterIcon, ArrowDownIcon, ArrowUpIcon, UserIcon, CheckCheckIcon, ArchiveIcon, SquarePenIcon, SearchIcon, XIcon, InboxIcon, SquarePlusIcon } from "lucide-react"

// ── Filter Tabs ──

type FilterTab = "all" | "unread" | "starred" | "attachments"

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "starred", label: "Starred" },
  { id: "attachments", label: "Files" },
]

// ── Segmented Tag Badge - matches sidebar-3 MetaBadge pattern ──

function TagBadge({ label, value, color }: MailTag) {
  return (
    <span
      className={cn(
        "border-border inline-flex h-[18px] shrink-0 items-center overflow-hidden border text-[10px] font-medium",
        "rounded-full"
      )}
    >
      <span className="border-border bg-muted/60 flex h-full items-center border-r px-1.5 leading-none">
        {label}
      </span>
      <span
        className={cn(
          "flex h-full items-center px-1.5 leading-none",
          color ?? "text-foreground/60"
        )}
        style={
          color
            ? {
                backgroundColor:
                  "color-mix(in oklch, currentColor 5%, transparent)",
              }
            : undefined
        }
      >
        {value}
      </span>
    </span>
  )
}

// ── Mail Preview Item ──

function MailItem({
  mail,
  isSelected,
  onClick,
}: {
  mail: Mail
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      id={mail.id}
      role="listitem"
      aria-pressed={isSelected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "relative flex cursor-pointer items-start gap-1.5 md:gap-2.5",
        "border-border/40 border-b px-1.5 py-2 md:px-3 md:py-3",
        "focus-visible:ring-ring transition-colors focus-visible:ring-1 focus-visible:outline-none focus-visible:ring-inset",
        isSelected
          ? "bg-accent/60 dark:bg-accent/20"
          : "hover:bg-accent/60 dark:hover:bg-accent/20"
      )}
    >
      {/* Unread indicator */}
      <div className="flex w-2 shrink-0 justify-center pt-3 md:pt-3.5">
        {mail.unread && (
          <span
            className="bg-primary size-1.5 shrink-0 rounded-full"
            aria-label="Unread"
          />
        )}
      </div>

      {/* Avatar */}
      <Avatar className="mt-0.5 size-6 shrink-0 md:size-8">
        {mail.sender.avatarUrl && (
          <AvatarImage src={mail.sender.avatarUrl} alt={mail.sender.name} />
        )}
        <AvatarFallback
          className={cn(
            "text-[11px] font-semibold text-white",
            mail.sender.avatarColor
          )}
        >
          {mail.sender.initials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex flex-col">
        {/* Sender row */}
        <div className="mb-1 flex items-center justify-between gap-1">
          <div className="flex min-w-0 items-center gap-1">
            <span
              className={cn(
                "truncate text-sm leading-tight",
                mail.unread
                  ? "text-foreground font-semibold"
                  : "text-foreground/75 font-medium"
              )}
            >
              {mail.sender.name}
            </span>
            {mail.priority === "high" && (
              <span
                className="text-destructive shrink-0 text-[10px] leading-none font-bold"
                aria-label="High priority"
              >
                !
              </span>
            )}
          </div>

          {/* Timestamp + icons */}
          <div className="flex shrink-0 items-center gap-1">
            {mail.starred && (
              <StarIcon className="size-3 text-amber-400" aria-hidden="true" />
            )}
            {mail.attachment && (
              <PaperclipIcon className="text-muted-foreground/50 size-3" aria-hidden="true" />
            )}
            <span
              className={cn(
                "text-[11px] whitespace-nowrap tabular-nums",
                mail.unread
                  ? "text-foreground/70 font-medium"
                  : "text-muted-foreground/60"
              )}
            >
              {mail.time}
            </span>
          </div>
        </div>

        {/* Subject */}
        <div className="mb-1 grid">
          <p
            className={cn(
              "min-w-0 truncate text-xs leading-tight",
              mail.unread
                ? "text-foreground/90 font-medium"
                : "text-foreground/70"
            )}
          >
            {mail.subject}
          </p>
        </div>

        {/* Preview - uniform across all items */}
        <div className="mb-1 grid">
          <p className="text-muted-foreground truncate text-xs leading-snug">
            {mail.preview}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Label + avatar group */}
          {(mail.label || mail.avatarGroup) && (
            <>
              {mail.avatarGroup && mail.avatarGroup.length > 0 && (
                <AvatarGroup className="-space-x-1">
                  {mail.avatarGroup.slice(0, 3).map((member) => (
                    <Avatar key={member.fallback} className="size-4">
                      {member.src && (
                        <AvatarImage src={member.src} alt={member.fallback} />
                      )}
                      <AvatarFallback
                        className={cn(
                          "text-[8px] font-bold text-white",
                          member.color
                        )}
                      >
                        {member.fallback}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {mail.avatarGroup.length > 3 && (
                    <AvatarGroupCount className="size-4 text-[8px] leading-none">
                      +{mail.avatarGroup.length - 3}
                    </AvatarGroupCount>
                  )}
                </AvatarGroup>
              )}
              {mail.label ? (
                <Badge variant={mail.labelVariant ?? "secondary"} size="sm">
                  {mail.label}
                </Badge>
              ) : null}
            </>
          )}

          {/* Tags as segmented badges */}
          {mail.tags &&
            mail.tags.length > 0 &&
            mail.tags.map((tag) => <TagBadge key={tag.label} {...tag} />)}
        </div>

        {/* File attachment - sidebar-3 ButtonGroup pattern */}
        {mail.attachment && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ButtonGroup>
              <Button
                variant="outline"
                size="xs"
                onClick={(e) => e.stopPropagation()}
                className="max-w-40"
              >
                <PaperclipIcon aria-hidden="true" />
                <span className="truncate">{mail.attachment.name}</span>
                <span className="hidden shrink-0 opacity-50 md:inline-block">
                  ({mail.attachment.size})
                </span>
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                aria-label="Download attachment"
                onClick={(e) => e.stopPropagation()}
              >
                <DownloadIcon aria-hidden="true" />
              </Button>
            </ButtonGroup>
          </div>
        )}

        {/* Action buttons */}
        {mail.actions && mail.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {mail.actions.slice(0, 2).map((action) => (
              <Button
                key={action.label}
                size="xs"
                variant={action.variant === "outline" ? "outline" : "default"}
                onClick={(e) => e.stopPropagation()}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mail List ──

interface MailListProps {
  hidden?: boolean
  selectedId?: string
  onSelect?: (id: string) => void
}

export function MailList({
  selectedId: selectedIdProp,
  onSelect,
}: MailListProps) {
  const [internalSelectedId, setInternalSelectedId] = useState(FEATURED_MAIL_ID)
  const selectedId = selectedIdProp ?? internalSelectedId

  const handleSelect = (id: string) => {
    if (!selectedIdProp) setInternalSelectedId(id)
    onSelect?.(id)
  }

  const [filter, setFilter] = useState<FilterTab>("all")
  const [query, setQuery] = useState("")

  const unreadCount = MAILS.filter((m) => m.unread).length
  const starredCount = MAILS.filter((m) => m.starred).length
  const attachmentCount = MAILS.filter((m) => m.attachment).length

  const tabCount: Record<FilterTab, number | undefined> = {
    all: undefined,
    unread: unreadCount,
    starred: starredCount,
    attachments: attachmentCount,
  }

  const filtered = MAILS.filter((mail) => {
    if (filter === "unread" && !mail.unread) return false
    if (filter === "starred" && !mail.starred) return false
    if (filter === "attachments" && !mail.attachment) return false
    if (query) {
      const q = query.toLowerCase()
      return (
        mail.sender.name.toLowerCase().includes(q) ||
        mail.subject.toLowerCase().includes(q) ||
        mail.preview.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className={cn("bg-background flex flex-1 flex-col overflow-hidden")}>
      {/* ── Header ── */}
      <div className="border-border flex h-(--header-height) shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <span className="text-sm leading-relaxed font-semibold">Inbox</span>
          {unreadCount > 0 && (
            <Badge className="rounded-full!" variant="outline" size="sm">
              {unreadCount}
            </Badge>
          )}
        </div>

        {/* Header tools */}
        <TooltipProvider>
          <div className="flex items-center gap-0.5">
            {/* Refresh */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Refresh inbox"
                    className="[&_svg]:opacity-60 [&_svg]:transition-opacity hover:[&_svg]:opacity-100"
                  />
                }
              >
                <RefreshCwIcon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>

            {/* Sort / filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Sort and filter"
                    className="[&_svg]:opacity-60 [&_svg]:transition-opacity hover:[&_svg]:opacity-100"
                  />
                }
              >
                <FilterIcon aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    Sort by
                  </DropdownMenuLabel>
                  <DropdownMenuItem>
                    <ArrowDownIcon aria-hidden="true" />
                    Date (newest first)
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ArrowUpIcon aria-hidden="true" />
                    Date (oldest first)
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <UserIcon aria-hidden="true" />
                    Sender
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    Actions
                  </DropdownMenuLabel>
                  <DropdownMenuItem>
                    <CheckCheckIcon aria-hidden="true" />
                    Mark all as read
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ArchiveIcon aria-hidden="true" />
                    Archive all read
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Compose */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Compose new email"
                    className="[&_svg]:opacity-60 [&_svg]:transition-opacity hover:[&_svg]:opacity-100"
                  />
                }
              >
                <SquarePenIcon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Compose</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* ── Search ── */}
      <div className="border-border/60 border-b px-3 py-2">
        <div className="relative">
          <SearchIcon className="text-muted-foreground/50 pointer-events-none absolute top-1/2 left-2.5 size-3 -translate-y-1/2" aria-hidden="true" />
          <Input
            placeholder="Search mail..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
            aria-label="Search mail"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-muted-foreground/50 hover:text-foreground absolute top-1/2 right-1 size-5 -translate-y-1/2"
            >
              <XIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Filter Tabs + Mail Content ── */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as FilterTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        {/* Tab bar row */}
        <div className="border-border/60 flex shrink-0 items-center overflow-x-auto border-b px-1.5 py-1.5 md:px-2">
          <TabsList className="h-auto gap-0.5 bg-transparent p-0">
            {TABS.map((tab) => {
              const count = tabCount[tab.id]
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "group/tab h-auto flex-none gap-1 px-2 py-0.75 text-xs font-normal md:gap-2 md:px-2.5",
                    "data-active:bg-primary! data-active:text-primary-foreground! data-active:font-medium! data-active:shadow-none!",
                    "dark:data-active:bg-primary! dark:data-active:text-primary-foreground!",
                    "rounded-full"
                  )}
                >
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <Badge
                      variant="secondary"
                      size="xs"
                      className="hidden rounded-full! leading-none md:inline-flex"
                    >
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* One panel per tab - base-ui only mounts the active panel */}
        {TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="max-h-full grow">
            <ScrollArea className="h-full grow">
              {filtered.length === 0 ? (
                <div
                  role="listitem"
                  className="flex flex-col items-center justify-center px-4 py-12 text-center"
                >
                  <InboxIcon className="text-muted-foreground/25 mb-2 size-8" aria-hidden="true" />
                  <p className="text-muted-foreground mb-3 text-xs">
                    {query
                      ? "No messages matching your search"
                      : "Your inbox is empty"}
                  </p>
                  {query ? (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setQuery("")}
                    >
                      Clear search
                    </Button>
                  ) : (
                    <Button variant="outline" size="xs" className="gap-1.5">
                      <SquarePlusIcon aria-hidden="true" />
                      Compose
                    </Button>
                  )}
                </div>
              ) : (
                filtered.map((mail) => (
                  <MailItem
                    key={mail.id}
                    mail={mail}
                    isSelected={selectedId === mail.id}
                    onClick={() => handleSelect(mail.id)}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}