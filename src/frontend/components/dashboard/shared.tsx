/**
 * @fileoverview Tiny presentational primitives reused across the dashboard
 * and analytics islands.
 *
 * - `InlineError` / `EmptyState`: every panel handles failure the same way —
 *   surfaced in place, never through `window.alert`.
 * - `ProgressRing`: the circular progress ring lifted from the ReUI Pro
 *   `data-grid-base-7` block (its `ModuleProgress` cell), re-toned with tokens.
 * - `chartColor` / `topWithOther`: the design-system chart palette rule —
 *   `chart-1..5` in order, anything beyond five grouped into "Other".
 */

"use client";

import { AlertTriangle, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { NameValue } from "./types";

/** `var(--chart-N)` for a zero-based series index (wraps at 5). */
export function chartColor(index: number): string {
  return `var(--chart-${(index % 5) + 1})`;
}

/**
 * Keep the four largest entries and fold the rest into "Other" so a chart
 * never needs more than five palette colours.
 */
export function topWithOther(data: NameValue[]): NameValue[] {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  if (sorted.length <= 5) return sorted;
  const rest = sorted.slice(4).reduce((sum, d) => sum + d.value, 0);
  return [...sorted.slice(0, 4), { name: "Other", value: rest }];
}

/**
 * Inline error block. Renders the `ApiError` message verbatim and offers a
 * retry button wired to the resource's `reload`.
 */
export function InlineError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "bg-destructive/10 flex flex-col items-center gap-3 rounded-lg px-4 py-8 text-center",
        className,
      )}
    >
      <AlertTriangle className="text-destructive size-5" aria-hidden />
      <p className="text-destructive text-sm">{message}</p>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/** Neutral empty state for a panel that loaded successfully but has no rows. */
export function EmptyState({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted/40 text-muted-foreground flex flex-col items-center gap-2 rounded-lg px-4 py-10 text-center",
        className,
      )}
    >
      <Inbox className="size-5" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Tone for a 0–100 progress value (tokens only). */
function progressTone(value: number): string {
  if (value >= 75) return "text-success";
  if (value >= 40) return "text-warning";
  if (value > 0) return "text-info";
  return "text-muted-foreground/35";
}

/** Circular 0–100 progress ring with the percentage in the middle. */
export function ProgressRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative size-10 shrink-0">
      <svg viewBox="0 0 44 44" className="absolute inset-0 size-10 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={radius} fill="none" className="stroke-muted-foreground/20" strokeWidth="3.25" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          className={cn("stroke-current", progressTone(pct))}
          strokeWidth="3.25"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="text-muted-foreground absolute inset-0 flex items-center justify-center text-[9px] leading-none font-medium tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
