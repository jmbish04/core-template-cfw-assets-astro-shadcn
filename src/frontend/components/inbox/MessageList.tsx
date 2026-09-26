/**
 * @fileoverview MessageList — the inbox list column, lifted from ReUI
 * `app-shell-4` (`MailList`): a header row with the unread badge and refresh,
 * live search, rounded filter tabs, and rich preview rows (unread dot, avatar,
 * sender, time, subject, snippet, label badges).
 *
 * Seams vs. the block: the fixture array and client-side filtering are gone —
 * rows, counts and tabs are driven by the parent `Inbox` island from
 * `GET /api/inbox`. The row gained a star toggle (an existing inbox feature)
 * layered over a full-row select button so there are no nested interactive
 * elements.
 */

import type { ReactNode } from "react";
import { RefreshCwIcon, SearchIcon, StarIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/reui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { EmailMessage, InboxView } from "./types";
import { senderInitials, senderLabel } from "./types";

const TABS: { id: InboxView; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "unread", label: "Unread" },
  { id: "starred", label: "Starred" },
  { id: "archive", label: "Archive" },
];

export interface MessageListProps {
  view: InboxView;
  onViewChange: (view: InboxView) => void;
  query: string;
  onQueryChange: (q: string) => void;
  messages: EmailMessage[];
  unread: number;
  selectedId: string | null;
  loading: boolean;
  onRefresh: () => void;
  onSelect: (msg: EmailMessage) => void;
  onToggleStar: (msg: EmailMessage) => void;
  /** Rendered in place of rows when the view has no messages. */
  empty: ReactNode;
}

/** Skeleton rows for the initial load. */
function ListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border-border/40 flex items-start gap-2.5 border-b px-3 py-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** One preview row (app-shell-4 `MailItem`). */
function MailItem({
  msg,
  selected,
  onSelect,
  onToggleStar,
}: {
  msg: EmailMessage;
  selected: boolean;
  onSelect: (msg: EmailMessage) => void;
  onToggleStar: (msg: EmailMessage) => void;
}) {
  const label = senderLabel(msg);
  const unread = !msg.read;
  return (
    <div
      role="listitem"
      className={cn(
        "relative flex items-start gap-2.5 border-b border-border/40 px-3 py-3 transition-colors",
        "has-[button:focus-visible]:bg-accent/60 dark:has-[button:focus-visible]:bg-accent/20",
        selected ? "bg-accent/60 dark:bg-accent/20" : "hover:bg-accent/60 dark:hover:bg-accent/20",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(msg)}
        aria-current={selected ? "true" : undefined}
        aria-label={`Open email from ${label}: ${msg.subject}`}
        className="absolute inset-0 z-0 focus-visible:outline-none"
      />

      {/* Unread indicator */}
      <div className="pointer-events-none relative z-10 flex w-2 shrink-0 justify-center pt-3.5">
        {unread && <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-label="Unread" />}
      </div>

      <Avatar className="pointer-events-none relative z-10 mt-0.5 size-8 shrink-0">
        <AvatarFallback className="text-[11px] font-semibold">
          {senderInitials(msg.fromName, msg.fromAddress)}
        </AvatarFallback>
      </Avatar>

      <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="mb-1 flex items-center justify-between gap-1">
          <span
            className={cn(
              "truncate text-sm leading-tight",
              unread ? "text-foreground font-semibold" : "text-foreground/75 font-medium",
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              "shrink-0 text-[11px] whitespace-nowrap tabular-nums",
              unread ? "text-foreground/70 font-medium" : "text-muted-foreground",
            )}
          >
            {relativeTime(msg.receivedAt)}
          </span>
        </div>
        <p
          className={cn(
            "mb-1 truncate text-xs leading-tight",
            unread ? "text-foreground/90 font-medium" : "text-foreground/70",
          )}
        >
          {msg.subject}
        </p>
        <p className="text-muted-foreground truncate text-xs leading-snug">{msg.snippet}</p>
        {msg.labels.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {msg.labels.map((l) => (
              <Badge key={l} variant="secondary" size="sm">
                {l}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={msg.starred ? "Unstar message" : "Star message"}
        aria-pressed={msg.starred}
        onClick={() => onToggleStar(msg)}
        className="relative z-10 shrink-0 text-muted-foreground"
      >
        <StarIcon aria-hidden="true" className={cn(msg.starred && "fill-warning text-warning")} />
      </Button>
    </div>
  );
}

/** The list column: header, search, filter tabs, rows. */
export function MessageList({
  view,
  onViewChange,
  query,
  onQueryChange,
  messages,
  unread,
  selectedId,
  loading,
  onRefresh,
  onSelect,
  onToggleStar,
  empty,
}: MessageListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Mail</span>
          {unread > 0 && (
            <Badge variant="outline" size="sm" radius="full">
              {unread} unread
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh mail"
          onClick={onRefresh}
          disabled={loading}
          className="text-muted-foreground"
        >
          <RefreshCwIcon aria-hidden="true" className={cn(loading && "animate-spin")} />
        </Button>
      </div>

      {/* Search */}
      <div className="border-border/60 border-b px-3 py-2">
        <div className="relative">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            placeholder="Search mail…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="h-8 pl-8 text-sm"
            aria-label="Search mail"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 -translate-y-1/2"
            >
              <XIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs (server-side views) */}
      <Tabs value={view} onValueChange={(v) => onViewChange(v as InboxView)} className="gap-0">
        <div className="border-border/60 flex shrink-0 items-center overflow-x-auto border-b px-2 py-1.5">
          <TabsList className="h-auto gap-0.5 bg-transparent p-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "h-auto flex-none gap-1.5 rounded-full px-2.5 py-0.75 text-xs font-normal",
                  "data-active:bg-primary! data-active:text-primary-foreground! data-active:font-medium! data-active:shadow-none!",
                )}
              >
                {tab.label}
                {tab.id === "unread" && unread > 0 && (
                  <Badge variant="secondary" size="xs" radius="full" className="hidden md:inline-flex">
                    {unread}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <ScrollArea className="min-h-0 flex-1">
        {loading && messages.length === 0 ? (
          <ListSkeleton />
        ) : messages.length === 0 ? (
          empty
        ) : (
          <div role="list" aria-label="Messages">
            {messages.map((msg) => (
              <MailItem
                key={msg.id}
                msg={msg}
                selected={msg.id === selectedId}
                onSelect={onSelect}
                onToggleStar={onToggleStar}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
