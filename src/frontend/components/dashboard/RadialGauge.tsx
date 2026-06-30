/**
 * @fileoverview RadialGauge — a recharts `RadialBarChart` KPI gauge.
 *
 * Replicates the shadcn "gauges" chart block in the Monolith dark system: a
 * single 270° radial arc that fills proportionally to a 0–100 percentage, with
 * a bold value rendered in the polar center and an optional caption beneath it.
 *
 * Design rules honoured:
 *   - recharts ONLY, wrapped in `<ChartContainer>` (no Chart.js/Plotly/etc.).
 *   - Track + value colours come from the OKLCH `--chart-1..5` palette.
 *   - Center text is forced to `hsl(var(--foreground))` for high contrast.
 *   - No 1px borders; the gauge lives inside a `bg-card` / ring-based shell.
 *
 * The gauge is purely presentational — callers pass an already-computed
 * percentage derived from REAL `/api/dashboard/stats` fields (e.g. completion
 * rate, active-project ratio). No data is fabricated here.
 */

"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  RadialBar,
  RadialBarChart,
  Label as RechartsLabel,
} from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

export interface RadialGaugeProps {
  /** 0–100 value the arc fills to. Clamped defensively. */
  value: number;
  /** Big text shown in the gauge center (defaults to `${value}%`). */
  centerLabel?: string;
  /** Small caption under the big center text (e.g. "of tasks done"). */
  caption?: string;
  /** Palette colour for the filled arc. Defaults to `--chart-1`. */
  color?: string;
  /** Tailwind sizing for the chart box. */
  className?: string;
}

const GAUGE_CONFIG: ChartConfig = {
  value: { label: "Value" },
};

/**
 * A 270° radial gauge with a bold center value. The background ring is the
 * muted track; the foreground arc fills to `value` percent.
 */
export function RadialGauge({
  value,
  centerLabel,
  caption,
  color = "var(--chart-1)",
  className = "mx-auto aspect-square w-full max-w-[180px]",
}: RadialGaugeProps) {
  const pct = useMemo(() => Math.max(0, Math.min(100, value)), [value]);
  const data = useMemo(() => [{ name: "value", value: pct, fill: color }], [pct, color]);
  const display = centerLabel ?? `${Math.round(pct)}%`;

  return (
    <ChartContainer config={GAUGE_CONFIG} className={className}>
      <RadialBarChart
        data={data}
        startAngle={225}
        endAngle={-45}
        innerRadius="72%"
        outerRadius="100%"
        barSize={14}
      >
        {/* Hidden axis pins the 0–100 domain so the arc length maps to `pct`. */}
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
        <PolarGrid gridType="circle" radialLines={false} stroke="none" />
        <RadialBar
          dataKey="value"
          background={{ fill: "hsl(var(--muted))" }}
          cornerRadius={999}
          isAnimationActive
        >
          <RechartsLabel
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox)) return null;
              const { cx, cy } = viewBox as { cx: number; cy: number };
              return (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan
                    x={cx}
                    y={caption ? cy - 4 : cy}
                    className="fill-foreground text-[1.6rem] font-semibold tabular-nums"
                  >
                    {display}
                  </tspan>
                  {caption ? (
                    <tspan x={cx} y={cy + 18} className="fill-muted-foreground text-[0.7rem]">
                      {caption}
                    </tspan>
                  ) : null}
                </text>
              );
            }}
          />
        </RadialBar>
      </RadialBarChart>
    </ChartContainer>
  );
}
