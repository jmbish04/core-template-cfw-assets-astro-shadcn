/**
 * @fileoverview Recent activity feed for the dashboard.
 *
 * Pulls `GET /api/activity?limit=8` and renders the newest audit-log rows
 * (actor, summary, entity-type badge, relative time), honouring the dashboard
 * search box (`?q=`). Surface: a stacked ReUI `Frame` whose row list mirrors
 * the dashboard-4 block's `IntegrationsPanel` (Item rows + dashed separators).
 * The header carries the unread-notification count from `/api/dashboard/stats`
 * with a link to `/notifications`.
 *
 * LOADING shows skeleton rows; ERROR surfaces inline (with retry); EMPTY shows
 * a neutral placeholder.
 */

"use client";

import { Badge } from "@/components/reui/badge";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { compactNumber, relativeTime } from "@/lib/format";

import { EmptyState, InlineError } from "./shared";
import type { ActivityResponse } from "./types";
import type { Resource } from "./useDashboardData";

/** First letter of the actor for the avatar tile. */
function initial(actor: string): string {
  return (actor.trim()[0] ?? "?").toUpperCase();
}

export function RecentActivity({
  resource,
  unread,
}: {
  resource: Resource<ActivityResponse>;
  /** Unread notification count, when known. */
  unread?: number;
}) {
  const { data, loading, error, reload } = resource;
  const rows = data?.data ?? [];

  return (
    <Frame stacked className="min-h-full w-full">
      <FrameHeader className="flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <FrameTitle>Recent activity</FrameTitle>
          <FrameDescription className="text-xs">Latest audit-log events.</FrameDescription>
        </div>
        <Button variant="outline" size="sm" render={<a href="/notifications" />} nativeButton={false}>
          Alerts
          {unread ? (
            <Badge variant="warning-light" radius="full">
              {compactNumber(unread)}
            </Badge>
          ) : null}
        </Button>
      </FrameHeader>

      <FramePanel className="p-0!">
        {error ? (
          <InlineError className="m-4" message={error} onRetry={reload} />
        ) : loading && !data ? (
          <ul className="flex flex-col gap-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-[80%]" />
                  <Skeleton className="h-3 w-[40%]" />
                </div>
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <EmptyState className="m-4" label="No recent activity." />
        ) : (
          <ul className="flex flex-col">
            {rows.map((row, index) => (
              <li key={row.id}>
                <Item size="sm" className="items-start gap-3 px-3 py-3">
                  <ItemMedia className="bg-muted text-muted-foreground size-8 rounded-full text-xs font-medium">
                    {initial(row.actor)}
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-1">
                    <ItemTitle className="line-clamp-2 text-sm font-normal">
                      <span className="font-medium">{row.actor}</span> {row.summary}
                    </ItemTitle>
                    <ItemDescription className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" size="sm">
                        {row.entityType}
                      </Badge>
                      {relativeTime(row.createdAt) || "—"}
                    </ItemDescription>
                  </ItemContent>
                </Item>
                {index < rows.length - 1 ? (
                  <Separator className="mx-3 w-auto border-t border-dashed bg-transparent" />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </FramePanel>
    </Frame>
  );
}
