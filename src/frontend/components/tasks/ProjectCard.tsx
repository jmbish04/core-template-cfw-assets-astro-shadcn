/**
 * @fileoverview ProjectCard — one project tile for the ProjectList, adapted
 * from the ReUI Pro block `card-21` (a FramePanel inside a shared Frame grid:
 * media tile + action top row, title, then a dot-separated meta line). The
 * media tile carries the project's own colour; the action is the star toggle
 * (`POST /api/projects/{id}/star`). Clicking the tile opens the preview.
 */

import { StarIcon } from "lucide-react";

import { FramePanel } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { compactNumber, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ProjectStatusBadge } from "./StatusBadge";
import type { Project } from "./types";

export interface ProjectCardProps {
  project: Project;
  /** Toggle the star. Optimistic at the parent. */
  onToggleStar: (project: Project) => void;
  /** Open the project preview modal. */
  onOpen: (project: Project) => void;
  /** Whether a star request is currently in flight for this project. */
  starPending?: boolean;
}

export function ProjectCard({ project, onToggleStar, onOpen, starPending }: ProjectCardProps) {
  return (
    <FramePanel
      role="button"
      tabIndex={0}
      aria-label={`Open project ${project.name}`}
      onClick={() => onOpen(project)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(project);
        }
      }}
      className="flex cursor-pointer flex-col gap-5 transition-colors outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring max-md:gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* project.color is user data (stored hex), so it stays an inline style. */}
          <span
            aria-hidden
            className="size-8 shrink-0 rounded-md ring-1 ring-foreground/10"
            style={{ backgroundColor: project.color }}
          />
          <ProjectStatusBadge status={project.status} />
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={project.starred ? `Unstar ${project.name}` : `Star ${project.name}`}
          aria-pressed={project.starred}
          disabled={starPending}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(project);
          }}
        >
          <StarIcon
            aria-hidden
            className={cn(project.starred ? "fill-warning text-warning" : "text-muted-foreground")}
          />
        </Button>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="truncate text-sm leading-tight font-semibold">{project.name}</span>
        <p className="line-clamp-2 text-sm text-muted-foreground max-md:hidden">
          {project.description || "No description"}
        </p>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate font-medium text-foreground">{project.owner}</span>
          <span aria-hidden className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
          <span className="shrink-0 tabular-nums">
            {compactNumber(project.taskCount)} {project.taskCount === 1 ? "task" : "tasks"}
          </span>
          <span aria-hidden className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
          <span className="shrink-0">Updated {relativeTime(project.updatedAt)}</span>
        </div>
      </div>
    </FramePanel>
  );
}
