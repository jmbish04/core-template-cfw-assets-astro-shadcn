/**
 * @fileoverview task-filtering — the ReUI Filters schema for the `/tasks` grid
 * plus the two ways a filter query is applied:
 *
 *   - {@link toServerParams}: the positive, top-level AND rules the API can
 *     answer (`?status=`, `?priority=`, `?projectId=`, `?assignee=`, `?label=`
 *     — all "any of" CSV params), so the fetched page is already narrowed.
 *   - {@link matchesQuery}: the full tree (AND/OR groups, negations, empty
 *     checks) evaluated client-side over the fetched rows. Re-applying the
 *     server-side rules is idempotent, so the two never disagree.
 *
 * Enum fields show human labels (never ids); the project field is a lookup from
 * `useProjects()`; assignee and label options are derived from loaded tasks.
 */

import type { ReactNode } from "react";

import {
  createFilterQuery,
  createFilterRule,
  isFilterRule,
} from "@/components/reui/filters/filters-query";
import type {
  FilterField,
  FilterNode,
  FilterQuery,
  FilterRule,
  FilterValueDisplayContext,
} from "@/components/reui/filters/filters-types";

import { PriorityBadge } from "./PriorityBadge";
import { TaskStatusBadge } from "./StatusBadge";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./types";

/** Filterable task attributes, keyed by the field id used in rule paths. */
type TaskFieldId = "title" | "status" | "priority" | "projectId" | "assignee" | "label";

/** "N selected" once more than one value is picked; otherwise defer. */
function selectedCount(values: unknown[]): string | null {
  if (values.length === 0) return "Select…";
  if (values.length > 1) return `${values.length} selected`;
  return null;
}

/** Build the Filters field schema from the live option vocabularies. */
export function buildTaskFilterFields(input: {
  projects: { value: string; label: string }[];
  assignees: string[];
  labels: string[];
}): FilterField[] {
  return [
    { id: "title", label: "Title", type: "text", placeholder: "Title contains…" },
    {
      id: "status",
      label: "Status",
      type: "select",
      searchable: false,
      options: (Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => ({
        value: s,
        label: STATUS_LABELS[s],
      })),
      renderValue: ({ values }: FilterValueDisplayContext): ReactNode =>
        selectedCount(values) ?? <TaskStatusBadge status={values[0] as TaskStatus} />,
    },
    {
      id: "priority",
      label: "Priority",
      type: "select",
      searchable: false,
      options: (Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => ({
        value: p,
        label: PRIORITY_LABELS[p],
      })),
      renderValue: ({ values }: FilterValueDisplayContext): ReactNode =>
        selectedCount(values) ?? <PriorityBadge priority={values[0] as TaskPriority} />,
    },
    {
      id: "projectId",
      label: "Project",
      type: "select",
      searchable: true,
      placeholder: "Search projects…",
      options: input.projects,
    },
    {
      id: "assignee",
      label: "Assignee",
      type: "select",
      searchable: true,
      placeholder: "Search people…",
      options: input.assignees.map((a) => ({ value: a, label: a })),
    },
    {
      id: "label",
      label: "Label",
      type: "multiselect",
      searchable: true,
      placeholder: "Search labels…",
      options: input.labels.map((l) => ({ value: l, label: l })),
    },
  ];
}

/** Initial query: empty, or one `Project is …` rule seeded from `?projectId=`. */
export function initialTaskQuery(projectId?: string): FilterQuery {
  return createFilterQuery(
    projectId
      ? [createFilterRule({ id: "seed-project", path: ["projectId"], operator: "is", value: projectId })]
      : [],
  );
}

/** A rule's value as an array (`[]` when unset). */
function ruleValues(rule: FilterRule): unknown[] {
  if (rule.value === undefined || rule.value === null || rule.value === "") return [];
  return Array.isArray(rule.value) ? rule.value : [rule.value];
}

/** Server query-param name per field (title is covered by `q`). */
const SERVER_PARAM: Partial<Record<TaskFieldId, string>> = {
  status: "status",
  priority: "priority",
  projectId: "projectId",
  assignee: "assignee",
  label: "label",
};

/**
 * The positive top-level rules of an AND query as API params. Anything the API
 * can't express (negations, OR, empty checks) stays client-side only.
 */
export function toServerParams(query: FilterQuery): Record<string, string> {
  if (query.combinator !== "and") return {};
  const params: Record<string, string> = {};
  for (const node of query.rules) {
    if (!isFilterRule(node) || node.negated) continue;
    const param = SERVER_PARAM[node.path[0] as TaskFieldId];
    const values = ruleValues(node).map(String);
    if (!param || values.length === 0) continue;
    if (!["is", "is_any_of", "has_any_of"].includes(node.operator)) continue;
    // ponytail: a second rule on the same field would need intersection; the
    // client pass still enforces it, the server just fetches the wider set.
    if (params[param]) continue;
    params[param] = values.join(",");
  }
  return params;
}

/** The raw value of a field on a task (labels stay an array). */
function fieldValue(task: Task, field: string): unknown {
  if (field === "label") return task.labels ?? [];
  return task[field as keyof Task] ?? null;
}

/** Evaluate one rule. Incomplete rules (no operator/value yet) match everything. */
function matchesRule(task: Task, rule: FilterRule): boolean {
  if (!rule.operator) return true;
  const raw = fieldValue(task, rule.path[0] ?? "");
  const values = ruleValues(rule);
  const isEmpty = raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0);
  let result: boolean;

  switch (rule.operator) {
    case "empty":
      result = isEmpty;
      break;
    case "not_empty":
      result = !isEmpty;
      break;
    default: {
      if (values.length === 0) return true; // value not picked yet
      const hay = Array.isArray(raw) ? raw.map(String) : [String(raw ?? "")];
      const text = hay.join(" ").toLowerCase();
      const needles = values.map((v) => String(v));
      switch (rule.operator) {
        case "contains":
          result = needles.some((n) => text.includes(n.toLowerCase()));
          break;
        case "not_contains":
          result = !needles.some((n) => text.includes(n.toLowerCase()));
          break;
        case "starts_with":
          result = needles.some((n) => text.startsWith(n.toLowerCase()));
          break;
        case "ends_with":
          result = needles.some((n) => text.endsWith(n.toLowerCase()));
          break;
        case "is":
        case "is_any_of":
        case "has_any_of":
          result = needles.some((n) => hay.includes(n));
          break;
        case "is_not":
        case "is_none_of":
        case "has_none_of":
          result = !needles.some((n) => hay.includes(n));
          break;
        case "has_all_of":
          result = needles.every((n) => hay.includes(n));
          break;
        default:
          return true; // operator this schema never offers
      }
    }
  }
  return rule.negated ? !result : result;
}

/** Evaluate a node (rule or AND/OR group) against a task. */
export function matchesQuery(task: Task, node: FilterNode): boolean {
  if (isFilterRule(node)) return matchesRule(task, node);
  if (node.rules.length === 0) return true;
  return node.combinator === "or"
    ? node.rules.some((child) => matchesQuery(task, child))
    : node.rules.every((child) => matchesQuery(task, child));
}
