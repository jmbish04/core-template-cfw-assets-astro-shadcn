/**
 * @fileoverview RankedBars — horizontal ranked bar list in a Frame.
 *
 * Adapted from the ReUI Pro `dashboard-4` block's `AgentsPanel` ("Most called
 * agents"): pill-shaped horizontal bars with a tinted fill, a colour dot, the
 * label inside the bar and the value at the end, plus a Count / Share select.
 * Changed: data comes in as `NameValue[]` from the API, tones are the
 * `chart-1..5` tokens in order (anything past five is grouped as "Other"),
 * and the value column uses `text-foreground` so it stays legible in dark.
 * Replaces the old vertical priority / project bar charts.
 */

"use client";

import { useState } from "react";

import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { compactNumber } from "@/lib/format";

import { chartColor, EmptyState, InlineError, topWithOther } from "./shared";
import type { NameValue } from "./types";

type Mode = "count" | "share";

const MODES: { value: Mode; label: string }[] = [
  { value: "count", label: "Count" },
  { value: "share", label: "Share" },
];

export interface RankedBarsProps {
  title: string;
  description: string;
  data: NameValue[] | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function RankedBars({ title, description, data, loading, error, onRetry }: RankedBarsProps) {
  const [mode, setMode] = useState<Mode>("count");
  const rows = topWithOther(data ?? []).filter((d) => d.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0);
  const max = rows[0]?.value ?? 0;

  return (
    <Frame stacked className="min-h-full w-full overflow-hidden">
      <FrameHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <FrameTitle>{title}</FrameTitle>
          <FrameDescription className="text-xs">{description}</FrameDescription>
        </div>
        <Select value={mode} onValueChange={(v) => v && setMode(v as Mode)} items={MODES}>
          <SelectTrigger size="sm" aria-label={`${title} value`} className="min-w-24 shrink-0">
            <SelectValue placeholder="Show" />
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false}>
            <SelectGroup>
              {MODES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FrameHeader>

      <FramePanel className="p-0!">
        <div className="space-y-3 px-4 py-4">
          {error ? (
            <InlineError message={error} onRetry={onRetry} />
          ) : loading && !data ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-full" />)
          ) : rows.length === 0 ? (
            <EmptyState label="Nothing to rank yet." />
          ) : (
            rows.map((row, index) => {
              const color = chartColor(index);
              const share = total > 0 ? Math.round((row.value / total) * 100) : 0;
              return (
                <div key={row.name} className="grid min-w-0 grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3">
                  <div className="bg-muted relative h-8 min-w-0 overflow-hidden rounded-full">
                    <div
                      className="absolute inset-y-0 start-0 rounded-full opacity-25"
                      style={{ width: `${max > 0 ? (row.value / max) * 100 : 0}%`, backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <span className="relative z-10 flex h-full min-w-0 items-center gap-2 px-3 text-xs font-medium">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                      <span className="truncate">{row.name}</span>
                    </span>
                  </div>
                  <span className="text-foreground justify-self-end text-end text-xs font-semibold tabular-nums">
                    {mode === "count" ? compactNumber(row.value) : `${share}%`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </FramePanel>
    </Frame>
  );
}
