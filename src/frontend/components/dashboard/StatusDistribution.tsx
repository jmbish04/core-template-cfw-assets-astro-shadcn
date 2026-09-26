/**
 * @fileoverview StatusDistribution — tasks-by-status share of total.
 *
 * Adapted from the ReUI Pro `chart-9` block ("Capital Inflows"): a stacked
 * Frame with a compact header row, a big total with a trend-style Badge, a
 * segmented distribution bar and a separated row list. Changed: the fund
 * fixtures become the real `tasksByStatus` series, segments use `chart-1..5`
 * in order, the badge shows the completion rate, and the range Select is
 * replaced by a link to the board (the page-level range filter already
 * drives this data). Replaces the old status donut (no-pie rule).
 */

"use client";

import { ArrowRightIcon } from "lucide-react";

import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { compactNumber } from "@/lib/format";

import { chartColor, EmptyState, InlineError, topWithOther } from "./shared";
import type { NameValue } from "./types";

export interface StatusDistributionProps {
  data: NameValue[] | null;
  /** 0–100; shown as the header badge when provided. */
  completionPct?: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function StatusDistribution({ data, completionPct, loading, error, onRetry }: StatusDistributionProps) {
  const rows = topWithOther(data ?? []).filter((d) => d.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0);
  const label = rows.map((r) => `${r.name} ${Math.round((r.value / total) * 100)}%`).join(", ");

  return (
    <Frame stacked className="text-foreground min-h-full w-full">
      <FramePanel className="flex items-center justify-between gap-3 p-3.5!">
        <h2 className="text-sm font-medium">Tasks by status</h2>
        <Button variant="ghost" size="sm" render={<a href="/tasks/board" />} nativeButton={false}>
          Board
          <ArrowRightIcon aria-hidden="true" />
        </Button>
      </FramePanel>

      <FramePanel className="p-5!">
        {error ? (
          <InlineError message={error} onRetry={onRetry} />
        ) : loading && !data ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : total === 0 ? (
          <EmptyState label="No tasks yet." />
        ) : (
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="text-3xl leading-none font-medium tabular-nums">{compactNumber(total)}</span>
              <span className="text-muted-foreground text-sm">tasks</span>
              {completionPct !== undefined ? (
                <Badge variant="success-light" className="border-none">
                  {completionPct}% done
                </Badge>
              ) : null}
            </div>

            <div className="flex h-2.5 w-full gap-1" role="img" aria-label={`Status distribution: ${label}`}>
              {rows.map((r, i) => (
                <div
                  key={r.name}
                  className="min-w-3 rounded-full"
                  style={{ flexBasis: `${(r.value / total) * 100}%`, backgroundColor: chartColor(i) }}
                />
              ))}
            </div>

            <ul className="flex flex-col">
              {rows.map((r, i) => (
                <li key={r.name} className="first:pt-2">
                  <div className="flex items-center gap-3">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColor(i) }} aria-hidden />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">{Math.round((r.value / total) * 100)}%</p>
                    <p className="w-12 text-right text-sm font-medium tabular-nums">{compactNumber(r.value)}</p>
                  </div>
                  {i < rows.length - 1 ? <Separator className="my-2.5 w-auto" /> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </FramePanel>
    </Frame>
  );
}
