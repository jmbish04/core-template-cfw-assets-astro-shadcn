/**
 * @fileoverview TeamAnalyticsView — the `/analytics` island.
 *
 * Replaces `components/tasks/TeamAnalytics` with the same ReUI Pro blocks as
 * /dashboard, so both pages read as one system:
 *   1. Metric — MetricRow (chart-28): completion, active projects, overdue
 *   2. Chart  — StatusDistribution (chart-9) | priority RankedBars (dashboard-4)
 *   3. Action — ProjectProgressGrid (data-grid-base-7), rows link to /tasks
 *
 * Data is the same as before: `GET /api/tasks` + `GET /api/projects` (up to
 * 200 each) aggregated client-side, all-time (no range filter).
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangleIcon, CheckCircle2Icon, FolderKanbanIcon } from "lucide-react";

import {
  BOARD_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type ListEnvelope,
  type Project,
  type Task,
  type TaskPriority,
} from "@/components/tasks/types";
import { ApiError, apiGet } from "@/lib/api";
import { compactNumber } from "@/lib/format";

import { MetricRow, type Metric } from "./MetricRow";
import { ProjectProgressGrid, type ProjectRow } from "./ProjectProgressGrid";
import { RankedBars } from "./RankedBars";
import { EmptyState, InlineError } from "./shared";
import { StatusDistribution } from "./StatusDistribution";
import type { NameValue } from "./types";

const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];

interface Aggregates {
  metrics: Metric[];
  byStatus: NameValue[];
  byPriority: NameValue[];
  completionPct: number;
  projectRows: ProjectRow[];
}

/** Aggregate raw tasks/projects into every panel's input. */
function aggregate(tasks: Task[], projects: Project[]): Aggregates {
  const now = Date.now();
  const perProject = new Map<string, { total: number; done: number }>();
  let done = 0;
  let overdue = 0;

  for (const t of tasks) {
    if (t.status === "done") done += 1;
    if (t.dueDate != null && t.status !== "done") {
      const due = typeof t.dueDate === "number" ? t.dueDate : new Date(t.dueDate).getTime();
      if (!Number.isNaN(due) && due < now) overdue += 1;
    }
    if (t.projectId) {
      const agg = perProject.get(t.projectId) ?? { total: 0, done: 0 };
      agg.total += 1;
      if (t.status === "done") agg.done += 1;
      perProject.set(t.projectId, agg);
    }
  }

  const total = tasks.length;
  const open = total - done;
  const active = projects.filter((p) => p.status === "active").length;
  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    completionPct,
    metrics: [
      {
        title: "Completion",
        value: `${completionPct}%`,
        total: `${compactNumber(done)} of ${compactNumber(total)} tasks`,
        ratio: total > 0 ? done / total : 0,
        color: "var(--color-success)",
        icon: <CheckCircle2Icon className="opacity-60" aria-hidden />,
      },
      {
        title: "Active projects",
        value: compactNumber(active),
        total: `of ${compactNumber(projects.length)}`,
        ratio: projects.length > 0 ? active / projects.length : 0,
        color: "var(--color-info)",
        icon: <FolderKanbanIcon className="opacity-60" aria-hidden />,
      },
      {
        title: "Overdue",
        value: compactNumber(overdue),
        total: `of ${compactNumber(open)} open`,
        ratio: open > 0 ? overdue / open : 0,
        color: "var(--color-destructive)",
        icon: <AlertTriangleIcon className="opacity-60" aria-hidden />,
      },
    ],
    byStatus: BOARD_STATUSES.map((s) => ({
      name: STATUS_LABELS[s],
      value: tasks.filter((t) => t.status === s).length,
    })),
    byPriority: PRIORITIES.map((p) => ({
      name: PRIORITY_LABELS[p],
      value: tasks.filter((t) => t.priority === p).length,
    })),
    projectRows: projects.map((p) => {
      const agg = perProject.get(p.id) ?? { total: p.taskCount, done: 0 };
      return {
        id: p.id,
        name: p.name,
        owner: p.owner,
        status: p.status,
        done: agg.done,
        total: agg.total,
        pct: agg.total > 0 ? Math.round((agg.done / agg.total) * 100) : 0,
      };
    }),
  };
}

export function TeamAnalyticsView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, p] = await Promise.all([
        apiGet<ListEnvelope<Task>>("tasks", { limit: 200 }),
        apiGet<ListEnvelope<Project>>("projects", { limit: 200 }),
      ]);
      setTasks(t.data);
      setProjects(p.data);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message} — retry to reload analytics.` : "Could not load analytics. Retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const agg = useMemo(() => aggregate(tasks, projects), [tasks, projects]);

  if (error) return <InlineError message={error} onRetry={load} />;

  if (!loading && tasks.length === 0 && projects.length === 0) {
    return <EmptyState label="Nothing to analyze yet — create projects and tasks to populate these metrics." />;
  }

  return (
    <div className="@container flex flex-col gap-3">
      <MetricRow metrics={loading ? null : agg.metrics} count={3} />
      <section className="grid gap-3 @3xl:grid-cols-2">
        <StatusDistribution data={loading ? null : agg.byStatus} completionPct={agg.completionPct} loading={loading} />
        <RankedBars
          title="Tasks by priority"
          description="How urgent the backlog is."
          data={loading ? null : agg.byPriority}
          loading={loading}
        />
      </section>
      {loading ? null : <ProjectProgressGrid rows={agg.projectRows} />}
    </div>
  );
}
