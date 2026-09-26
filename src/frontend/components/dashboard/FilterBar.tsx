/**
 * @fileoverview Dashboard filter toolbar — search + range + status.
 *
 * Styled after the ReUI Pro `dashboard-4` block's `OverviewToolbar`: a bare
 * row of Selects (range carries a calendar icon) that wraps on mobile, with
 * the search box as an InputGroup. Controlled — all state lives in
 * {@link AdminDashboard}, which debounces the search before it hits the API.
 * Selects pass `items` so Base UI renders labels, never raw values.
 */

"use client";

import { CalendarIcon, SearchIcon, XIcon } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { RangeValue, StatusValue } from "./types";

const RANGE_OPTIONS: { value: RangeValue; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "todo", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "done", label: "Done" },
];

export interface FilterBarProps {
  q: string;
  range: RangeValue;
  status: StatusValue;
  onQChange: (q: string) => void;
  onRangeChange: (range: RangeValue) => void;
  onStatusChange: (status: StatusValue) => void;
}

/** Search + time-range + status toolbar driving every dashboard query. */
export function FilterBar({ q, range, status, onQChange, onRangeChange, onStatusChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
      <InputGroup className="w-full sm:w-64">
        <InputGroupAddon align="inline-start">
          <SearchIcon className="text-muted-foreground size-4" aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search activity and tasks…"
          aria-label="Search activity and tasks"
          autoComplete="off"
        />
        {q ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => onQChange("")}>
              <XIcon className="size-4" aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={range} onValueChange={(v) => v && onRangeChange(v as RangeValue)} items={RANGE_OPTIONS}>
          <SelectTrigger className="w-40" aria-label="Date range">
            <CalendarIcon className="size-4" aria-hidden="true" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => v && onStatusChange(v as StatusValue)} items={STATUS_OPTIONS}>
          <SelectTrigger className="w-40" aria-label="Task status">
            <SelectValue placeholder="Task status" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
