/**
 * @fileoverview useTaskFacets — derives the distinct assignee and label option
 * lists for the Tasks filter bar from real data (`GET /api/tasks`), so the
 * Assignee and Label facets present an actual, searchable multi-select list
 * instead of a free-text input.
 *
 * It fetches an unfiltered page of tasks once (limit 200) and reduces them to
 * sorted, de-duplicated `assignees[]` and `labels[]`. Errors are swallowed into
 * `error` (never thrown) so a failed fetch degrades the facets to empty rather
 * than blanking the host island — matching the {@link useProjects} contract.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet, ApiError } from "@/lib/api";

import type { ListEnvelope, Task } from "./types";

export interface UseTaskFacetsResult {
  /** Distinct assignee display names, sorted A→Z. */
  assignees: string[];
  /** Distinct labels across all tasks, sorted A→Z. */
  labels: string[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Load a wide page of tasks and reduce them to distinct assignee + label lists
 * for the faceted filters.
 */
export function useTaskFacets(): UseTaskFacetsResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet<ListEnvelope<Task>>("tasks", { limit: 200, sort: "createdAt" })
      .then((res) => {
        if (!cancelled) setTasks(res.data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Failed to load task facets.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => reload(), [reload]);

  const assignees = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.assignee && t.assignee.trim()) set.add(t.assignee.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const labels = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      for (const l of t.labels ?? []) {
        if (l && l.trim()) set.add(l.trim());
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  return { assignees, labels, loading, error, reload };
}
