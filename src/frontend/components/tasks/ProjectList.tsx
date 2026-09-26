/**
 * @fileoverview ProjectList — the `/projects` island. Loads projects from
 * `GET /api/projects` with debounced search (`q`), status filter, starred
 * filter, and a sort selector. Supports a grid/list view toggle, optimistic
 * star toggling (`POST /api/projects/{id}/star`), and a "New project" Dialog
 * (`POST /api/projects`). Laid out as one ReUI Frame (header + toolbar) around
 * a `card-21` style tile grid (see ProjectCard).
 *
 * Every async path renders LOADING (skeletons), EMPTY, and inline ERROR states.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderPlusIcon, LayoutGridIcon, ListIcon, SearchIcon } from "lucide-react";

import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiSend, ApiError } from "@/lib/api";

import { EmptyState, ErrorState } from "./Shared";
import { FilterSelect } from "./FilterSelect";
import { ProjectCard } from "./ProjectCard";
import { ProjectDialog } from "./ProjectDialog";
import { ProjectPreviewDialog } from "./ProjectPreviewDialog";
import { PROJECT_STATUS_LABELS, type ListEnvelope, type Project } from "./types";

const STATUS_OPTIONS = (Object.keys(PROJECT_STATUS_LABELS) as (keyof typeof PROJECT_STATUS_LABELS)[]).map(
  (value) => ({ value, label: PROJECT_STATUS_LABELS[value] }),
);

const STARRED_OPTIONS = [
  { value: "true", label: "Starred only" },
  { value: "false", label: "Unstarred" },
];

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Recently updated" },
  { value: "createdAt", label: "Recently created" },
  { value: "name", label: "Name" },
  { value: "taskCount", label: "Task count" },
];

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [starred, setStarred] = useState<string | undefined>();
  const [sort, setSort] = useState<string>("updatedAt");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [pendingStarId, setPendingStarId] = useState<string | null>(null);

  // Preview modal state.
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Debounce the free-text search so we don't hammer the API per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<ListEnvelope<Project>>("projects", {
        q: debouncedQ || undefined,
        status,
        starred,
        sort,
        limit: 100,
      });
      if (id !== reqId.current) return; // a newer request superseded this one
      setProjects(res.data);
      setTotal(res.total);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof ApiError ? e.message : "Failed to load projects.");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [debouncedQ, status, starred, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  // Optimistic star toggle with rollback on failure.
  const toggleStar = useCallback(async (project: Project) => {
    setPendingStarId(project.id);
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, starred: !p.starred } : p)),
    );
    try {
      const res = await apiSend<{ id: string; starred: boolean }>(
        "POST",
        `projects/${project.id}/star`,
      );
      setProjects((prev) =>
        prev.map((p) => (p.id === res.id ? { ...p, starred: res.starred } : p)),
      );
    } catch (e) {
      // Roll back the optimistic flip and surface the error.
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, starred: project.starred } : p)),
      );
      setError(e instanceof ApiError ? e.message : "Failed to update star.");
    } finally {
      setPendingStarId(null);
    }
  }, []);

  // Insert a newly created project at the top without a full reload.
  const handleCreated = useCallback((project: Project) => {
    setProjects((prev) => [project, ...prev]);
    setTotal((t) => t + 1);
  }, []);

  const openPreview = useCallback((project: Project) => {
    setPreviewProject(project);
    setPreviewOpen(true);
  }, []);

  // Replace an edited project in place and keep the preview in sync.
  const handleUpdated = useCallback((project: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
    setPreviewProject(project);
  }, []);

  const hasFilters = Boolean(debouncedQ || status || starred);
  // card-21 grid: one Frame, tiles 3-up at container width ≥ 2xl, 1-up in list view.
  const gridClass = useMemo(
    () => (view === "grid" ? "grid gap-1 @2xl:grid-cols-2 @4xl:grid-cols-3" : "grid gap-1"),
    [view],
  );

  const newProjectButton = (variant: "default" | "outline") => (
    <ProjectDialog
      onSaved={handleCreated}
      trigger={
        <Button variant={variant}>
          <FolderPlusIcon className="size-4" aria-hidden />
          New project
        </Button>
      }
    />
  );

  return (
    <Frame spacing="sm" className="@container w-full">
      <FrameHeader className="flex-row items-center justify-between gap-3">
        <div className="flex flex-col gap-px">
          <FrameTitle>All projects</FrameTitle>
          <FrameDescription className="text-xs">
            {loading
              ? "Loading…"
              : `Showing ${projects.length} of ${total} ${total === 1 ? "project" : "projects"}`}
          </FrameDescription>
        </div>
        {newProjectButton("default")}
      </FrameHeader>

      <div className="flex flex-wrap items-center gap-2 px-(--frame-panel-header-px) pb-2">
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <SearchIcon className="size-4" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
          />
        </InputGroup>
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          allLabel="All statuses"
          aria-label="Filter by status"
        />
        <FilterSelect
          value={starred}
          onChange={setStarred}
          options={STARRED_OPTIONS}
          allLabel="All projects"
          aria-label="Filter by starred"
        />
        <FilterSelect
          value={sort}
          onChange={(v) => setSort(v ?? "updatedAt")}
          options={SORT_OPTIONS}
          allLabel="Recently updated"
          aria-label="Sort projects"
        />
        <div className="ml-auto flex items-center gap-1 max-md:hidden">
          <Button
            size="icon-sm"
            variant={view === "grid" ? "secondary" : "ghost"}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <LayoutGridIcon className="size-4" aria-hidden />
          </Button>
          <Button
            size="icon-sm"
            variant={view === "list" ? "secondary" : "ghost"}
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <ListIcon className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={load} className="mx-1 mb-1" /> : null}

      {loading ? (
        <div className={gridClass}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <FramePanel>
          <EmptyState
            icon={<FolderPlusIcon />}
            title={hasFilters ? "No projects match your filters" : "No projects yet"}
            description={
              hasFilters
                ? "Clear the search or filters to see more projects."
                : "Create your first project to start grouping tasks and notes."
            }
            action={newProjectButton("outline")}
            className="bg-transparent ring-0"
          />
        </FramePanel>
      ) : (
        <div className={gridClass}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onToggleStar={toggleStar}
              onOpen={openPreview}
              starPending={pendingStarId === project.id}
            />
          ))}
        </div>
      )}

      <ProjectPreviewDialog
        project={previewProject}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onSaved={handleUpdated}
      />
    </Frame>
  );
}
