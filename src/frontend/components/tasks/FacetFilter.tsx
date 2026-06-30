/**
 * @fileoverview FacetFilter — a reusable Linear-style faceted chip filter.
 *
 * A single facet renders as an outline {@link Button} (the {@link FacetButton})
 * that shows the facet label, a count separator, and the active selection as
 * inline chips (up to two values) or a count badge ("N selected") when more
 * than two values are selected. Clicking it opens a Base-UI {@link Popover}
 * whose body is an optional search box ({@link FacetSearch}) plus a checkbox
 * list of options. Selection is multi-select: toggling a checkbox adds/removes
 * the value from the controlled `value` string array.
 *
 * This is a fully controlled component — the parent owns `value` and receives
 * the next array via `onChange`. It is intentionally backend-agnostic: each
 * option carries an optional `render` to draw a status icon, priority badge,
 * label chip, or assignee avatar inline in both the trigger chips and the list.
 *
 * Built entirely on the project's Base-UI primitives (Popover, Checkbox, Badge,
 * Separator, InputGroup) — zero Radix, Monolith dark theme (ring-based
 * separation, no 1px borders).
 */

"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { CheckIcon, PlusCircleIcon, SearchIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single selectable option within a facet. */
export interface FacetOption {
  /** The stable value persisted into the query array. */
  value: string;
  /** Human label shown in the option row and (by default) the trigger chip. */
  label: string;
  /**
   * Optional custom renderer for the option's leading visual (status icon,
   * priority badge, label chip, assignee avatar). Receives a `context` so the
   * same option can render slightly differently inside the trigger chip vs. the
   * popover list row if desired.
   */
  render?: (ctx: { context: "trigger" | "list" }) => ReactNode;
  /** Optional keyword string appended to the label for search matching. */
  keywords?: string;
}

export interface FacetFilterProps {
  /** Facet label, e.g. "Status", "Assignee". */
  label: string;
  /** All selectable options. */
  options: FacetOption[];
  /** Currently selected values (controlled). */
  value: string[];
  /** Called with the next selection array whenever a checkbox toggles. */
  onChange: (next: string[]) => void;
  /**
   * Show an in-popover search box. Defaults to auto: enabled when there are
   * more than 8 options (assignee / label facets).
   */
  searchable?: boolean;
  /** Placeholder for the search box. */
  searchPlaceholder?: string;
  /** Optional className on the trigger button. */
  className?: string;
}

// ---------------------------------------------------------------------------
// FacetButton — the outline trigger with inline selection chips
// ---------------------------------------------------------------------------

interface FacetButtonProps {
  label: string;
  /** The options matching the current selection, in selection-stable order. */
  selected: FacetOption[];
  className?: string;
}

/**
 * The outline trigger button. Renders the facet label, and — when there is an
 * active selection — a vertical {@link Separator} followed by either up to two
 * value chips or a single "N selected" count badge.
 */
function FacetButton({ label, selected, className }: FacetButtonProps) {
  const count = selected.length;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-8 gap-1.5 border-dashed", count > 0 && "border-solid", className)}
    >
      <PlusCircleIcon className="size-3.5 text-muted-foreground" />
      <span>{label}</span>
      {count > 0 ? (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-4 bg-border/60" />
          {count > 2 ? (
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
              {count} selected
            </Badge>
          ) : (
            <span className="flex items-center gap-1">
              {selected.map((opt) => (
                <Badge
                  key={opt.value}
                  variant="secondary"
                  className="rounded-sm px-1 font-normal"
                >
                  {opt.render ? opt.render({ context: "trigger" }) : opt.label}
                </Badge>
              ))}
            </span>
          )}
        </>
      ) : null}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// FacetSearch — the in-popover search field
// ---------------------------------------------------------------------------

interface FacetSearchProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

/** Compact search input rendered at the top of a searchable facet popover. */
function FacetSearch({ value, onChange, placeholder }: FacetSearchProps) {
  return (
    <InputGroup className="h-8">
      <InputGroupAddon>
        <SearchIcon className="size-3.5" />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search…"}
        aria-label={placeholder ?? "Search options"}
      />
    </InputGroup>
  );
}

// ---------------------------------------------------------------------------
// FacetFilter — the orchestrator
// ---------------------------------------------------------------------------

/**
 * A reusable multi-select facet filter. See the file header for behavior.
 */
export function FacetFilter({
  label,
  options,
  value,
  onChange,
  searchable,
  searchPlaceholder,
  className,
}: FacetFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listboxId = useId();

  const showSearch = searchable ?? options.length > 8;
  const selectedSet = useMemo(() => new Set(value), [value]);

  // The selected options in the order they appear in `value` (stable chips).
  const selectedOptions = useMemo(() => {
    const byValue = new Map(options.map((o) => [o.value, o]));
    return value
      .map((v) => byValue.get(v) ?? { value: v, label: v })
      .filter(Boolean) as FacetOption[];
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [options, query]);

  function toggle(optValue: string) {
    if (selectedSet.has(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        render={
          <FacetButton label={label} selected={selectedOptions} className={className} />
        }
      />
      <PopoverContent align="start" className="w-64 gap-0 p-0">
        {showSearch ? (
          <div className="p-2">
            <FacetSearch
              value={query}
              onChange={setQuery}
              placeholder={searchPlaceholder ?? `Search ${label.toLowerCase()}…`}
            />
          </div>
        ) : null}

        <ScrollArea className="max-h-64">
          <div aria-label={label} id={listboxId} className="flex flex-col p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No matches
              </p>
            ) : (
              filtered.map((opt) => {
                const checked = selectedSet.has(opt.value);
                return (
                  <button
                      key={opt.value}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        // Render-only mirror of selection; the row button owns the toggle.
                        tabIndex={-1}
                        aria-hidden
                        className="pointer-events-none"
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        {opt.render ? opt.render({ context: "list" }) : (
                          <span className="truncate">{opt.label}</span>
                        )}
                      </span>
                      {checked ? (
                        <CheckIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : null}
                    </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {value.length > 0 ? (
          <>
            <Separator className="bg-border/40" />
            <div className="p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-center text-xs text-muted-foreground"
                onClick={() => onChange([])}
              >
                <XIcon className="size-3.5" />
                Clear {label.toLowerCase()}
              </Button>
            </div>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
