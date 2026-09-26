/**
 * @fileoverview OverviewChart — the hero time-series of /dashboard.
 *
 * Adapted from the ReUI Pro `dashboard-4` block's `OverviewChart`: a stacked
 * Frame whose header is a row of metric tabs that switch one composed
 * area + line series, with a min / max readout. Kept: the tab strip, the
 * hatched area fill, the dot-indicator tooltip and domain padding. Changed:
 * the metrics are real series from `GET /api/dashboard/charts`
 * (`tasksOverTime`), each on its own `chart-N` token; tab values are range
 * totals; "View more" links to the task board.
 */

"use client";

import { useState, type CSSProperties } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { Frame, FrameHeader, FramePanel } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { compactNumber, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { EmptyState, InlineError } from "./shared";
import type { DashboardCharts } from "./types";
import type { Resource } from "./useDashboardData";

type MetricKey = "created" | "completed" | "net";

const METRICS: { id: MetricKey; label: string; detail: string }[] = [
  { id: "created", label: "Created", detail: "tasks" },
  { id: "completed", label: "Completed", detail: "tasks" },
  { id: "net", label: "Net backlog change", detail: "created − done" },
];

const chartConfig = {
  created: { label: "Created", color: "var(--chart-1)" },
  completed: { label: "Completed", color: "var(--chart-2)" },
  net: { label: "Net backlog change", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function OverviewChart({ resource }: { resource: Resource<DashboardCharts> }) {
  const [active, setActive] = useState<MetricKey>("created");
  const { data, loading, error, reload } = resource;

  const points = (data?.tasksOverTime ?? []).map((p) => ({
    date: shortDate(p.date),
    created: p.created,
    completed: p.completed,
    net: p.created - p.completed,
  }));
  const totals: Record<MetricKey, number> = {
    created: points.reduce((s, p) => s + p.created, 0),
    completed: points.reduce((s, p) => s + p.completed, 0),
    net: points.reduce((s, p) => s + p.net, 0),
  };
  const values = points.map((p) => p[active]);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const pad = Math.max(1, Math.ceil((max - min) * 0.15));
  const domain: [number, number] = [active === "net" ? min - pad : Math.max(0, min - pad), max + pad];

  return (
    <Frame stacked className="w-full overflow-hidden">
      <FrameHeader className="p-0!">
        <div className="grid grid-cols-3">
          {METRICS.map((metric, index) => {
            const isActive = metric.id === active;
            return (
              <button
                key={metric.id}
                type="button"
                className={cn(
                  "focus-visible:ring-ring/50 group hover:bg-muted/40 relative flex min-h-18 min-w-0 flex-col items-start justify-center gap-1 px-4 py-3 text-start transition-colors outline-none focus-visible:z-10 focus-visible:ring-[3px]",
                  index < METRICS.length - 1 && "border-e",
                  isActive && "bg-muted/60",
                )}
                aria-pressed={isActive}
                onClick={() => setActive(metric.id)}
              >
                <span
                  className={cn(
                    "truncate text-xs transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {metric.label}
                </span>
                <span className="text-foreground text-sm font-semibold tabular-nums">
                  {data ? compactNumber(totals[metric.id]) : "—"}
                  <span className="text-muted-foreground ms-1 hidden text-xs font-normal sm:inline">
                    {metric.detail}
                  </span>
                </span>
                {isActive ? (
                  <span className="bg-foreground absolute inset-x-4 bottom-0 h-0.5" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      </FrameHeader>

      <FramePanel className="p-0!">
        <div className="px-4 pt-6 pb-3">
          {error ? (
            <InlineError message={error} onRetry={reload} />
          ) : loading && !data ? (
            <Skeleton className="h-[320px] w-full" />
          ) : points.length === 0 ? (
            <EmptyState label="No task activity in this range." />
          ) : (
            <>
              <div className="text-muted-foreground mb-5 flex flex-wrap items-center justify-end gap-2 text-xs">
                <span>
                  Min <span className="text-foreground font-medium tabular-nums">{compactNumber(min)}</span>
                </span>
                <span aria-hidden="true" className="bg-muted-foreground/40 size-1 shrink-0 rounded-full" />
                <span>
                  Max <span className="text-foreground font-medium tabular-nums">{compactNumber(max)}</span>
                </span>
              </div>

              <ChartContainer
                config={chartConfig}
                className="h-[240px] w-full sm:h-[320px]"
              >
                <ComposedChart accessibilityLayer data={points} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <pattern id="dashboard-overview-stripe" patternUnits="userSpaceOnUse" width="6" height="6">
                      <rect width="6" height="6" fill={`var(--color-${active})`} opacity="0.04" />
                      <path d="M0,6 L6,0" stroke={`var(--color-${active})`} strokeWidth="0.8" opacity="0.15" />
                    </pattern>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    tick={{ fill: "var(--muted-foreground)" }}
                  />
                  <YAxis hide domain={domain} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        className="min-w-40 gap-2.5"
                        labelFormatter={(value) => (
                          <div className="border-border/50 mb-0.5 border-b pb-2">
                            <span className="text-xs font-medium">{value}</span>
                          </div>
                        )}
                        formatter={(value, name) => {
                          const key = name as MetricKey;
                          return (
                            <div className="flex w-full items-center justify-between gap-3">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="size-2.5 shrink-0 rounded-full bg-(--metric-color)"
                                  style={{ "--metric-color": `var(--color-${key})` } as CSSProperties}
                                />
                                <span className="text-muted-foreground">{chartConfig[key]?.label ?? key}</span>
                              </div>
                              <span className="text-foreground font-semibold tabular-nums">
                                {Number(value).toLocaleString()}
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Area
                    key={active}
                    type="natural"
                    dataKey={active}
                    fill="url(#dashboard-overview-stripe)"
                    stroke="none"
                    connectNulls
                    legendType="none"
                    tooltipType="none"
                  />
                  <Line
                    key={`${active}-line`}
                    type="natural"
                    dataKey={active}
                    stroke={`var(--color-${active})`}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: "var(--background)", stroke: `var(--color-${active})`, strokeWidth: 2 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ChartContainer>
            </>
          )}

          <div className="mt-2 flex justify-end">
            <Button variant="outline" render={<a href="/tasks/board" />} nativeButton={false}>
              Open task board
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
      </FramePanel>
    </Frame>
  );
}
