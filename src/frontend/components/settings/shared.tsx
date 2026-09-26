/**
 * @fileoverview Shared primitives for the settings islands (ReUI Frame surface).
 *
 * The rows follow ReUI settings-9 / settings-10: a `Frame` holding one
 * `FramePanel` whose children are shadcn `Item` rows split by `Separator`.
 *
 * Exports:
 *   - SettingRow     – one Item row: title + description left, control right
 *   - SettingsRows   – joins rows with Separators (settings-9 panel body)
 *   - SaveBar        – footer save + discard bar with an unsaved-changes badge
 *   - SavedFlash     – a transient "Saved" success badge
 *   - InlineError    – a destructive inline error line (ApiError.message)
 *   - RowSkeleton    – a loading placeholder shaped like a SettingRow
 *   - useSavedFlash  – `[show, flash]` pair driving SavedFlash
 *   - optionLabel    – value → label lookup for Select option lists
 */

"use client";

import * as React from "react";

import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** A select option: stored value + visible label. */
export interface Option {
  value: string;
  label: string;
}

/** Resolve an option's label; never show a raw value when a label exists. */
export function optionLabel(options: readonly Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/** One settings row (settings-9 PreferenceRow grammar). */
export function SettingRow({
  title,
  description,
  control,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  control: React.ReactNode;
  className?: string;
}) {
  return (
    <Item className={cn("px-4", className)}>
      <ItemContent className="min-w-0">
        <ItemTitle className="gap-2">{title}</ItemTitle>
        {description ? <ItemDescription>{description}</ItemDescription> : null}
      </ItemContent>
      <ItemActions>{control}</ItemActions>
    </Item>
  );
}

/** Joins children with Separators, like the settings-9 panel body. */
export function SettingsRows({ children }: { children: React.ReactNode }) {
  const rows = React.Children.toArray(children);
  return (
    <>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Separator /> : null}
          {row}
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Footer save + discard bar. Sticks to the bottom of the viewport while the
 * form is dirty so the save action is always reachable on long forms.
 */
export function SaveBar({
  dirty,
  saving,
  saved,
  disabled,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  disabled?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      className={cn(
        "bg-background/95 flex flex-wrap items-center justify-end gap-2 rounded-lg border px-4 py-2.5 backdrop-blur",
        dirty && "sticky bottom-4 z-10 shadow-sm",
      )}
    >
      <div className="mr-auto flex items-center gap-2 text-sm">
        {dirty ? (
          <Badge variant="warning-light">Unsaved changes</Badge>
        ) : (
          <SavedFlash show={saved} />
        )}
      </div>
      <Button variant="ghost" onClick={onDiscard} disabled={!dirty || saving}>
        Discard
      </Button>
      <Button onClick={onSave} disabled={!dirty || saving || disabled}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

/** A transient success badge. The caller flips `show` off (see useSavedFlash). */
export function SavedFlash({ show, label = "Saved" }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <Badge variant="success-light" role="status">
      {label}
    </Badge>
  );
}

/** A destructive inline error line, typically fed `ApiError.message`. */
export function InlineError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

/** A loading placeholder shaped like a SettingRow. */
export function RowSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

/**
 * Returns a `[show, flash]` pair. Calling `flash()` sets `show` true for `ms`
 * milliseconds then clears it — used for the "Saved" confirmation.
 */
export function useSavedFlash(ms = 2500): [boolean, () => void] {
  const [show, setShow] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setShow(true);
    timer.current = setTimeout(() => setShow(false), ms);
  }, [ms]);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return [show, flash];
}

/** Browser event fired after any mutation of the notifications feed. */
export const NOTIFICATIONS_CHANGED = "notifications:changed";
