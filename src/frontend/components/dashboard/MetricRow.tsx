/**
 * @fileoverview MetricRow — the metric layer of /dashboard and /analytics.
 *
 * Adapted from the ReUI Pro `chart-28` block (operational KPI cards with a
 * 40-segment bar gauge). Kept: the Frame + divided-cell grid, icon tile,
 * "value of total" line and the block's own `SegmentedChart`. Changed: the
 * fixture array is replaced by a `metrics` prop fed from real API data, the
 * dead overflow button is dropped, and below `sm` each cell collapses to a
 * dense label | value row (the gauge hides) per the mobile strategy.
 *
 * Every value is pre-formatted by the caller with `compactNumber`.
 */

"use client";

import type { ReactNode } from "react";

import { SegmentedChart } from "@/components/blocks/chart-28/components/segmented-chart";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Item, ItemMedia } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** One KPI cell. `ratio` (0–1) drives how many of the 40 segments fill. */
export interface Metric {
  title: string;
  value: string;
  /** e.g. "of 120 tasks". */
  total: string;
  ratio: number;
  /** A CSS colour token, e.g. `var(--color-success)`. */
  color: string;
  icon: ReactNode;
}

const SEGMENTS = 40;

/** Grid columns by metric count (container queries, as in the block). */
const COLS: Record<number, string> = {
  3: "@2xl:grid-cols-3",
  4: "@2xl:grid-cols-2 @5xl:grid-cols-4",
};

function MetricCell({ metric }: { metric: Metric }) {
  const filled = Math.round(Math.max(0, Math.min(1, metric.ratio)) * SEGMENTS);
  return (
    <div className="border-border/60 flex flex-col justify-between gap-3 border-b p-4 last:border-b-0 sm:min-h-[142px] sm:p-5 @2xl:border-e @2xl:border-b-0 @2xl:last:border-e-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Item className="border-background bg-muted [&_svg]:text-accent-foreground hidden size-10 shrink-0 items-center justify-center border-3 p-0 shadow-xs sm:flex dark:border-3 [&_svg]:size-5">
            <ItemMedia variant="icon" className="size-auto">
              {metric.icon}
            </ItemMedia>
          </Item>
          <h3 className="text-foreground truncate text-sm font-medium">{metric.title}</h3>
        </div>
        {/* Mobile: dense label | value row. */}
        <span className="text-foreground text-sm font-semibold tabular-nums sm:hidden">
          {metric.value}
          <span className="text-muted-foreground ms-1 font-normal">{metric.total}</span>
        </span>
      </div>

      <div className="hidden flex-col gap-3 sm:flex">
        <div className="flex items-baseline gap-1.5">
          <span className="text-foreground text-xl font-semibold tabular-nums">{metric.value}</span>
          <span className="text-muted-foreground text-sm">{metric.total}</span>
        </div>
        <SegmentedChart
          label={metric.title}
          value={metric.value}
          total={metric.total}
          filled={filled}
          chartConfig={{ used: { label: metric.title, color: metric.color } }}
        />
      </div>
    </div>
  );
}

/** A framed row of KPI cells; `metrics === null` renders skeletons. */
export function MetricRow({ metrics, count = 4 }: { metrics: Metric[] | null; count?: number }) {
  return (
    <div className="@container w-full">
      <Frame className="w-full" spacing="xs">
        <FramePanel className="p-0!">
          <div className={cn("grid overflow-hidden", COLS[count] ?? COLS[4])}>
            {metrics
              ? metrics.map((m) => <MetricCell key={m.title} metric={m} />)
              : Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3 p-5 sm:min-h-[142px]">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="hidden h-6 w-20 sm:block" />
                    <Skeleton className="hidden h-5 w-full sm:block" />
                  </div>
                ))}
          </div>
        </FramePanel>
      </Frame>
    </div>
  );
}
