import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"

const SEGMENT_COUNT = 40
const segments = Array.from({ length: SEGMENT_COUNT }, (_, index) => index)

export function SegmentedChart({
  label,
  value,
  total,
  filled,
  chartConfig,
}: {
  label: string
  value: string
  total: string
  filled: number
  chartConfig: ChartConfig
}) {
  const chartData = segments.map((index) => ({
    index,
    value: 1,
    used: index < filled,
  }))

  return (
    <ChartContainer
      aria-label={`${label}: ${value} ${total}`}
      className="aspect-auto h-5 w-full"
      config={chartConfig}
    >
      <BarChart
        accessibilityLayer
        barCategoryGap="22%"
        data={chartData}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <XAxis dataKey="index" hide />
        <YAxis domain={[0, 1]} hide />
        <Bar dataKey="value" radius={2}>
          {chartData.map((point) => (
            <Cell
              key={point.index}
              fill={point.used ? "var(--color-used)" : "var(--muted)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}