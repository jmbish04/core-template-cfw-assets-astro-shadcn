/**
 * @fileoverview MessageView — the inbox reading pane. The action header is
 * lifted from ReUI `app-shell-4` (`AppHeader`): prev/next, truncated subject,
 * then a toolbar of star / archive-or-restore / overflow menu. Below it: sender
 * block, labels, and the body (HTML when present, else plain text).
 *
 * Seams vs. the block: reply / bookmark / delete / snooze are dropped (the API
 * has no send or delete), the overflow menu keeps "Mark as unread" (real PATCH),
 * and prev/next walk the loaded list. On mobile the pane renders inside a Sheet
 * owned by the parent, which supplies `onClose` for the back button.
 */

import {
  ArchiveIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  MailIcon,
  MailOpenIcon,
  MoreHorizontalIcon,
  StarIcon,
} from "lucide-react";

import { Badge } from "@/components/reui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { EmailMessage } from "./types";
import { senderInitials, senderLabel } from "./types";

export interface MessageViewProps {
  message: EmailMessage | null;
  /** Back handler — shown when the pane lives in the mobile Sheet. */
  onClose?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleStar: (msg: EmailMessage) => void;
  onArchive: (msg: EmailMessage) => void;
  onMoveToInbox: (msg: EmailMessage) => void;
  onMarkUnread: (msg: EmailMessage) => void;
}

/** Absolute date like "Jun 30, 2026, 9:14 AM" — the reader shows exact time. */
function fullDate(value: number | string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Desktop placeholder when nothing is selected. */
function NoSelection() {
  return (
    <Empty className="h-full border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MailOpenIcon />
        </EmptyMedia>
        <EmptyTitle>No message selected</EmptyTitle>
        <EmptyDescription>Pick an email from the list to read it here.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** The reading pane for one email. */
export function MessageView({
  message,
  onClose,
  onPrev,
  onNext,
  onToggleStar,
  onArchive,
  onMoveToInbox,
  onMarkUnread,
}: MessageViewProps) {
  if (!message) return <NoSelection />;

  const label = senderLabel(message);
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Action header (app-shell-4 AppHeader) */}
      <header className="border-border flex h-12 min-w-0 shrink-0 items-center gap-1 border-b px-2 sm:gap-1.5 sm:px-4">
        {onClose && (
          <Button variant="ghost" size="icon-sm" aria-label="Back to list" onClick={onClose}>
            <ArrowLeftIcon aria-hidden="true" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous message"
          disabled={!onPrev}
          onClick={onPrev}
          className="text-muted-foreground hidden shrink-0 sm:flex"
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next message"
          disabled={!onNext}
          onClick={onNext}
          className="text-muted-foreground hidden shrink-0 sm:flex"
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
        <div className="hidden items-center sm:flex">
          <Separator orientation="vertical" className="h-5" />
        </div>

        <h2 className="text-foreground w-0 flex-1 truncate text-sm leading-snug font-semibold">
          {message.subject}
        </h2>

        <div role="toolbar" aria-label="Message actions" className="ml-auto flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={message.starred ? "Unstar message" : "Star message"}
            aria-pressed={message.starred}
            onClick={() => onToggleStar(message)}
          >
            <StarIcon
              aria-hidden="true"
              className={cn(message.starred ? "fill-warning text-warning" : "text-muted-foreground")}
            />
          </Button>
          {message.folder === "archive" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Move to inbox"
              onClick={() => onMoveToInbox(message)}
              className="text-muted-foreground"
            >
              <InboxIcon aria-hidden="true" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Archive message"
              onClick={() => onArchive(message)}
              className="text-muted-foreground"
            >
              <ArchiveIcon aria-hidden="true" />
            </Button>
          )}
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
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onMarkUnread(message)}>
                <MailIcon aria-hidden="true" />
                Mark as unread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 px-4 pt-4 pb-10 sm:px-5">
          <div className="flex items-start gap-3">
            <Avatar className="size-9">
              <AvatarFallback>{senderInitials(message.fromName, message.fromAddress)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-muted-foreground truncate text-xs">&lt;{message.fromAddress}&gt;</span>
              </div>
              <div className="text-muted-foreground text-xs">
                to {message.toAddress} · {fullDate(message.receivedAt)}
              </div>
              {message.labels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.labels.map((l) => (
                    <Badge key={l} variant="secondary" size="sm">
                      {l}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {message.htmlBody ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none break-words [&_a]:text-primary"
              // Showcase content is from our own seed + parsed inbound mail.
              // For untrusted production mail, sanitize before rendering.
              dangerouslySetInnerHTML={{ __html: message.htmlBody }}
            />
          ) : (
            <pre className="text-foreground/90 font-sans text-sm leading-relaxed break-words whitespace-pre-wrap">
              {message.textBody}
            </pre>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
