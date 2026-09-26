/**
 * @fileoverview ActivityTimeline — filterable audit trail, built on ReUI
 * solution-users-6 (day-grouped Timeline whose events expand into a
 * Collapsible Frame of details).
 *
 * Reads `GET /api/activity` (newest first) with a debounced `q` search plus
 * `entityType` and `actor` filters. Filter options accumulate from loaded rows
 * so the selects don't collapse when a filter narrows the result set.
 */

"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIcon,
  BellIcon,
  ChevronRightIcon,
  FilterIcon,
  FolderIcon,
  ListChecksIcon,
  type LucideIcon,
  SearchIcon,
  SettingsIcon,
  StickyNoteIcon,
  WebhookIcon,
} from "lucide-react";

import { Badge } from "@/components/reui/badge";
import { Frame, FrameHeader, FramePanel } from "@/components/reui/frame";
import {
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { apiGet, ApiError } from "@/lib/api";
import { relativeTime, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { InlineError } from "./shared";

// ---------------------------------------------------------------------------
// Wire types — mirror `selectActivityLogSchema`.
// ---------------------------------------------------------------------------

interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string | number | Date;
}

interface ActivityListResponse {
  data: ActivityEntry[];
  total: number;
}

/** "No filter" sentinel — Base UI Select can't use an empty-string value. */
const ALL = "__all__";

const ENTITY_ICON: Record<string, LucideIcon> = {
  task: ListChecksIcon,
  project: FolderIcon,
  webhook: WebhookIcon,
  settings: SettingsIcon,
  notification: BellIcon,
  note: StickyNoteIcon,
};

/** Derive up to two initials from an actor display name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Group newest-first rows into day buckets, preserving order. */
function groupByDay(rows: ActivityEntry[]): { day: string; events: ActivityEntry[] }[] {
  const out: { day: string; events: ActivityEntry[] }[] = [];
  for (const row of rows) {
    const day = shortDate(row.createdAt);
    const last = out[out.length - 1];
    if (last && last.day === day) last.events.push(row);
    else out.push({ day, events: [row] });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Event row (solution-users-6 EventRow grammar)
// ---------------------------------------------------------------------------

function EventRow({ entry, step, isLast }: { entry: ActivityEntry; step: number; isLast: boolean }) {
  const Icon = ENTITY_ICON[entry.entityType.toLowerCase()] ?? ActivityIcon;
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <TimelineItem step={step} className={cn("ms-10", isLast ? "pb-0" : "pb-6")}>
      <TimelineHeader className="flex min-w-0 items-center justify-between gap-2.5">
        <TimelineSeparator className="bg-border! group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.5rem)] group-data-[orientation=vertical]/timeline:translate-y-7" />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TimelineTitle className="text-sm font-semibold">{entry.action}</TimelineTitle>
          <Badge variant="outline">{entry.entityType}</Badge>
          <span className="text-muted-foreground text-xs">{relativeTime(entry.createdAt)}</span>
        </div>
        <TimelineIndicator className="border-border bg-background text-muted-foreground flex size-6 items-center justify-center border shadow-xs group-data-[orientation=vertical]/timeline:-left-7 [&_svg]:size-3.5">
          <Icon aria-hidden="true" />
        </TimelineIndicator>
      </TimelineHeader>

      <TimelineContent className="mt-2">
        <Frame stacked dense spacing="sm">
          <Collapsible className="group/collapsible">
            <CollapsibleTrigger
              type="button"
              className="flex w-full"
              aria-label={`Toggle details for ${entry.action}`}
            >
              <FrameHeader className="flex min-w-0 grow flex-row items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarFallback className="text-[10px]">{initials(entry.actor)}</AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground min-w-0 truncate text-left text-sm font-medium">
                    {entry.actor}, {entry.summary}
                  </span>
                </div>
                <ChevronRightIcon
                  className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-open/collapsible:rotate-90"
                  aria-hidden="true"
                />
              </FrameHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FramePanel className="space-y-3">
                <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <DetailRow label="Actor">{entry.actor}</DetailRow>
                  <DetailRow label="When">
                    {shortDate(entry.createdAt)} ({relativeTime(entry.createdAt)})
                  </DetailRow>
                  <DetailRow label="Entity type">{entry.entityType}</DetailRow>
                  <DetailRow label="Entity id">
                    <span className="truncate font-mono text-xs">{entry.entityId ?? "—"}</span>
                  </DetailRow>
                </dl>
                <p className="text-muted-foreground text-xs leading-5">{entry.summary}</p>
                {hasMetadata ? (
                  <pre className="bg-muted/50 text-muted-foreground overflow-x-auto rounded-md p-2.5 font-mono text-xs">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                ) : null}
              </FramePanel>
            </CollapsibleContent>
          </Collapsible>
        </Frame>
      </TimelineContent>
    </TimelineItem>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground flex min-w-0 items-center truncate text-sm font-medium">
        {children}
      </dd>
    </div>
  );
}

/** A labelled filter Select with an "All …" option. */
function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const items = [{ value: ALL, label: allLabel }, ...options.map((o) => ({ value: o, label: o }))];
  return (
    <Select items={items} value={value} onValueChange={(v) => typeof v === "string" && onChange(v)}>
      <SelectTrigger className="w-full sm:w-44" aria-label={label}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityTimeline() {
  const [rows, setRows] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState<string>(ALL);
  const [actor, setActor] = useState<string>(ALL);
  const [entityTypeOptions, setEntityTypeOptions] = useState<string[]>([]);
  const [actorOptions, setActorOptions] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<ActivityListResponse>("activity", {
        q: q || undefined,
        entityType: entityType === ALL ? undefined : entityType,
        actor: actor === ALL ? undefined : actor,
        limit: 100,
      });
      setRows(res.data);
      setTotal(res.total);
      setEntityTypeOptions((prev) =>
        Array.from(new Set([...prev, ...res.data.map((r) => r.entityType)])).sort(),
      );
      setActorOptions((prev) =>
        Array.from(new Set([...prev, ...res.data.map((r) => r.actor)])).sort(),
      );
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Couldn't load activity. Refresh the page to try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [q, entityType, actor]);

  // Debounce every filter change (load's deps cover q, entityType and actor).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  const clearFilters = useCallback(() => {
    setQ("");
    setEntityType(ALL);
    setActor(ALL);
  }, []);

  const hasFilters = q !== "" || entityType !== ALL || actor !== ALL;
  const days = useMemo(() => groupByDay(rows), [rows]);

  return (
    <section className="flex w-full max-w-2xl flex-col gap-6" aria-label="Activity log">
      {/* Filters ------------------------------------------------------- */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search summary, action, or actor"
              className="pl-8"
              aria-label="Search activity"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <FilterSelect
              label="Filter by entity type"
              allLabel="All entity types"
              value={entityType}
              options={entityTypeOptions}
              onChange={setEntityType}
            />
            <FilterSelect
              label="Filter by actor"
              allLabel="All actors"
              value={actor}
              options={actorOptions}
              onChange={setActor}
            />
          </div>
        </div>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{loading ? "Loading…" : `${rows.length} of ${total} events`}</span>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <InlineError message={error} />

      {/* Timeline ------------------------------------------------------ */}
      {loading && rows.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-6 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : days.length === 0 ? (
        <Empty className="min-h-[280px] border-0 bg-transparent">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FilterIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{hasFilters ? "No matching activity" : "No activity yet"}</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Nothing matches these filters. Try another search or clear them."
                : "Actions across tasks, projects and settings will appear here."}
            </EmptyDescription>
          </EmptyHeader>
          {hasFilters ? (
            <EmptyContent>
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className={cn("space-y-8", loading && "opacity-60")}>
          {days.map((day) => (
            <div key={day.day} className="space-y-4">
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {day.day}
              </h2>
              <Timeline>
                {day.events.map((entry, index) => (
                  <EventRow
                    key={entry.id}
                    entry={entry}
                    step={index + 1}
                    isLast={index === day.events.length - 1}
                  />
                ))}
              </Timeline>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
