/**
 * @fileoverview AdminDashboardChrome — the presentational layout shell.
 *
 * Split out from {@link AdminDashboard} so the stateful island stays thin and
 * this file owns only composition + responsive layout. Three layers, all ReUI
 * Pro Frame blocks:
 *
 *   1. Metric  — MetricRow (chart-28 segmented gauges)
 *   2. Chart   — OverviewChart (dashboard-4 metric switcher) over
 *                StatusDistribution (chart-9) | priority + project RankedBars
 *                (dashboard-4 ranked bars)
 *   3. Action  — OpenTasksGrid (data-grid-base-7), then AI insights + activity
 */

"use client";

import { AlertTriangleIcon, CheckCircle2Icon, FolderKanbanIcon, ListTodoIcon } from "lucide-react";

import { compactNumber } from "@/lib/format";

import { FilterBar } from "./FilterBar";
import { InsightsPanel } from "./InsightsPanel";
import { MetricRow, type Metric } from "./MetricRow";
import { OpenTasksGrid } from "./OpenTasksGrid";
import { OverviewChart } from "./OverviewChart";
import { RankedBars } from "./RankedBars";
import { RecentActivity } from "./RecentActivity";
import { SeedBanner } from "./SeedBanner";
import { InlineError } from "./shared";
import { StatusDistribution } from "./StatusDistribution";
import type {
  ActivityResponse,
  DashboardCharts,
  DashboardInsights,
  DashboardStats,
  RangeValue,
  StatusValue,
} from "./types";
import type { OpenTasks, Resource } from "./useDashboardData";

export interface AdminDashboardChromeProps {
  q: string;
  range: RangeValue;
  status: StatusValue;
  onQChange: (q: string) => void;
  onRangeChange: (range: RangeValue) => void;
  onStatusChange: (status: StatusValue) => void;
  stats: Resource<DashboardStats>;
  charts: Resource<DashboardCharts>;
  insights: Resource<DashboardInsights>;
  activity: Resource<ActivityResponse>;
  openTasks: Resource<OpenTasks>;
  /** Called after demo data is seeded — reloads every panel. */
  onSeeded: () => void;
}

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

/** Map `/api/dashboard/stats` onto the four KPI cells. */
function toMetrics(s: DashboardStats): Metric[] {
  const open = Math.max(s.totalTasks - s.completedTasks, 0);
  return [
    {
      title: "Completed tasks",
      value: compactNumber(s.completedTasks),
      total: `of ${compactNumber(s.totalTasks)}`,
      ratio: ratio(s.completedTasks, s.totalTasks),
      color: "var(--color-success)",
      icon: <CheckCircle2Icon className="opacity-60" aria-hidden />,
    },
    {
      title: "Open tasks",
      value: compactNumber(open),
      total: `of ${compactNumber(s.totalTasks)}`,
      ratio: ratio(open, s.totalTasks),
      color: "var(--color-info)",
      icon: <ListTodoIcon className="opacity-60" aria-hidden />,
    },
    {
      title: "Overdue",
      value: compactNumber(s.overdueTasks),
      total: `of ${compactNumber(open)} open`,
      ratio: ratio(s.overdueTasks, open),
      color: "var(--color-destructive)",
      icon: <AlertTriangleIcon className="opacity-60" aria-hidden />,
    },
    {
      title: "Active projects",
      value: compactNumber(s.activeProjects),
      total: `of ${compactNumber(s.totalProjects)}`,
      ratio: ratio(s.activeProjects, s.totalProjects),
      color: "var(--color-warning)",
      icon: <FolderKanbanIcon className="opacity-60" aria-hidden />,
    },
  ];
}

export function AdminDashboardChrome({
  q,
  range,
  status,
  onQChange,
  onRangeChange,
  onStatusChange,
  stats,
  charts,
  insights,
  activity,
  openTasks,
  onSeeded,
}: AdminDashboardChromeProps) {
  const chartProps = {
    loading: charts.loading,
    error: charts.error,
    onRetry: charts.reload,
  };

  return (
    <div className="@container flex flex-col gap-3">
      <SeedBanner stats={stats} onSeeded={onSeeded} />

      <FilterBar
        q={q}
        range={range}
        status={status}
        onQChange={onQChange}
        onRangeChange={onRangeChange}
        onStatusChange={onStatusChange}
      />

      {/* 1 · Metric layer */}
      {stats.error ? (
        <InlineError message={stats.error} onRetry={stats.reload} />
      ) : (
        <MetricRow metrics={stats.data ? toMetrics(stats.data) : null} />
      )}

      {/* 2 · Chart layer */}
      <OverviewChart resource={charts} />
      <section className="grid gap-3 @3xl:grid-cols-2 @6xl:grid-cols-3">
        <StatusDistribution
          data={charts.data?.tasksByStatus ?? null}
          completionPct={stats.data?.completionRatePct}
          {...chartProps}
        />
        <RankedBars
          title="Tasks by priority"
          description="How urgent the backlog is."
          data={charts.data?.tasksByPriority ?? null}
          {...chartProps}
        />
        <RankedBars
          title="Projects by status"
          description="Portfolio breakdown."
          data={charts.data?.projectsByStatus ?? null}
          {...chartProps}
        />
      </section>

      {/* 3 · Action layer */}
      <OpenTasksGrid resource={openTasks} />
      <section className="grid gap-3 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <InsightsPanel resource={insights} />
        <RecentActivity resource={activity} unread={stats.data?.unreadNotifications} />
      </section>
    </div>
  );
}
