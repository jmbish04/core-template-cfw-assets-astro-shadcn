/**
 * @fileoverview Barrel for the pieces shared across feature surfaces.
 *
 * Wire types mirroring the API (`types`), the project lookup every surface
 * needs to turn a `projectId` into a name (`use-projects`), and the empty /
 * error / chip / avatar primitives that keep those affordances identical on
 * every page (`shared`).
 */
export * from "./types";
export * from "./use-projects";
export * from "./shared";
export { StatusBadge } from "./status-badge";
export { PriorityBadge } from "./priority-badge";
