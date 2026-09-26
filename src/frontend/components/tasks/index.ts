/**
 * @fileoverview Barrel for the Projects & Tasks feature surface. Astro pages
 * import the island components from here; the islands import each other via
 * relative paths to keep the dependency graph explicit.
 */

export * from "./types";
export { ProjectList } from "./ProjectList";
export { ProjectCard } from "./ProjectCard";
export { ProjectDialog } from "./ProjectDialog";
export { TaskBoard } from "./TaskBoard";
export { TaskList } from "./TaskList";
export { TaskDialog } from "./TaskDialog";
export { TaskPreviewDialog } from "./TaskPreviewDialog";
export { TaskDetail } from "./TaskDetail";
export { TaskDetailSidebar } from "./TaskDetailSidebar";
export { TaskBreadcrumbs } from "./TaskBreadcrumbs";
export { TaskSubtasks } from "./TaskSubtasks";
export { TaskRichEditor, type TaskRichEditorProps } from "./TaskRichEditor";
export { TaskRichHtml, type TaskRichHtmlProps } from "./TaskRichHtml";
export { htmlToPlainText, normalizeStoredToHtml, plateValueToHtml } from "./task-html";
export { sanitizeHtml } from "./sanitize-html";
export { SubtaskLinker } from "./SubtaskLinker";
export { ProjectPreviewDialog } from "./ProjectPreviewDialog";
export { useTaskFacets } from "./useTaskFacets";
export { NoteDialog } from "./NoteDialog";
export { PriorityBadge } from "./PriorityBadge";
export { TaskStatusBadge, ProjectStatusBadge } from "./StatusBadge";
export { FilterSelect } from "./FilterSelect";
export { useProjects } from "./useProjects";
