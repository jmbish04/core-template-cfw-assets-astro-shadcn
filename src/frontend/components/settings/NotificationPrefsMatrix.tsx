/**
 * @fileoverview NotificationPrefsMatrix — channel × category delivery matrix,
 * built on ReUI settings-11 (channel matrix table of per-row Checkboxes) set
 * inside a ReUI Frame to hold the frame surface.
 *
 * Loads every (channel, category) row from `GET /api/settings/notification-prefs`
 * (the backend seeds a full enabled matrix on first read) and saves the working
 * copy with `PUT /api/settings/notification-prefs` through the footer
 * save + discard bar. Column header checkboxes toggle a whole channel; the
 * trailing "All" column toggles a whole category.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { apiGet, ApiError, apiSend } from "@/lib/api";

import { InlineError, SaveBar, useSavedFlash } from "./shared";

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

const CHANNELS = ["email", "push", "in_app", "sms"] as const;
const CATEGORIES = ["tasks", "mentions", "projects", "system", "billing"] as const;

type Channel = (typeof CHANNELS)[number];
type Category = (typeof CATEGORIES)[number];

interface NotificationPref {
  id: string;
  channel: Channel;
  category: Category;
  enabled: boolean;
  updatedAt: string | number | Date;
}

const CHANNEL_LABELS: Record<Channel, string> = {
  email: "Email",
  push: "Push",
  in_app: "In-app",
  sms: "SMS",
};

const CATEGORY_LABELS: Record<Category, { label: string; description: string }> = {
  tasks: { label: "Tasks", description: "Assignments, status changes, due dates" },
  mentions: { label: "Mentions", description: "Someone @-mentions you" },
  projects: { label: "Projects", description: "Project updates and milestones" },
  system: { label: "System", description: "Maintenance and service notices" },
  billing: { label: "Billing", description: "Invoices and plan changes" },
};

type Matrix = Record<string, boolean>;

/** Compose a stable map key for a (channel, category) cell. */
function cellKey(channel: Channel, category: Category): string {
  return `${channel}:${category}`;
}

function toMatrix(rows: NotificationPref[]): Matrix {
  const next: Matrix = {};
  for (const row of rows) next[cellKey(row.channel, row.category)] = row.enabled;
  return next;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationPrefsMatrix() {
  const [savedMatrix, setSavedMatrix] = useState<Matrix>({});
  const [matrix, setMatrix] = useState<Matrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, flashSaved] = useSavedFlash();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = toMatrix(await apiGet<NotificationPref[]>("settings/notification-prefs"));
      setSavedMatrix(next);
      setMatrix(next);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Couldn't load notification preferences. Refresh the page to try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const on = (channel: Channel, category: Category) =>
    matrix[cellKey(channel, category)] ?? false;

  /** Set every listed cell to `enabled`. */
  const setCells = useCallback(
    (cells: [Channel, Category][], enabled: boolean) => {
      setMatrix((prev) => {
        const next = { ...prev };
        for (const [ch, cat] of cells) next[cellKey(ch, cat)] = enabled;
        return next;
      });
    },
    [],
  );

  const dirty = useMemo(
    () =>
      CHANNELS.some((ch) =>
        CATEGORIES.some(
          (cat) => (matrix[cellKey(ch, cat)] ?? false) !== (savedMatrix[cellKey(ch, cat)] ?? false),
        ),
      ),
    [matrix, savedMatrix],
  );

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const body = CHANNELS.flatMap((channel) =>
        CATEGORIES.map((category) => ({
          channel,
          category,
          enabled: matrix[cellKey(channel, category)] ?? false,
        })),
      );
      const next = toMatrix(
        await apiSend<NotificationPref[]>("PUT", "settings/notification-prefs", body),
      );
      setSavedMatrix(next);
      setMatrix(next);
      flashSaved();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Couldn't save notification preferences. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }, [matrix, flashSaved]);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <InlineError message={error} />

      <Frame>
        <FrameHeader>
          <FrameTitle>Delivery channels</FrameTitle>
          <FrameDescription>
            Pick where each type of update lands. Column checkboxes toggle a whole channel.
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="p-0!">
          {loading ? (
            <div className="space-y-2 p-4">
              {CATEGORIES.map((cat) => (
                <Skeleton key={cat} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-full pl-4 font-semibold">Category</TableHead>
                  {CHANNELS.map((channel) => {
                    const allOn = CATEGORIES.every((cat) => on(channel, cat));
                    return (
                      <TableHead key={channel} className="px-2 text-center">
                        <label className="text-muted-foreground flex flex-col items-center gap-1.5 text-xs">
                          {CHANNEL_LABELS[channel]}
                          <Checkbox
                            checked={allOn}
                            onCheckedChange={(checked) =>
                              setCells(
                                CATEGORIES.map((cat) => [channel, cat] as [Channel, Category]),
                                checked,
                              )
                            }
                            aria-label={`All categories via ${CHANNEL_LABELS[channel]}`}
                          />
                        </label>
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-muted-foreground pr-4 pl-2 text-center text-xs">
                    All
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CATEGORIES.map((category) => {
                  const rowAllOn = CHANNELS.every((ch) => on(ch, category));
                  const meta = CATEGORY_LABELS[category];
                  return (
                    <TableRow key={category}>
                      <TableCell className="pl-4 whitespace-normal">
                        <div className="text-sm font-medium">{meta.label}</div>
                        <div className="text-muted-foreground hidden text-xs sm:block">
                          {meta.description}
                        </div>
                      </TableCell>
                      {CHANNELS.map((channel) => (
                        <TableCell key={channel} className="px-2">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={on(channel, category)}
                              onCheckedChange={(checked) =>
                                setCells([[channel, category]], checked)
                              }
                              aria-label={`${meta.label} via ${CHANNEL_LABELS[channel]}`}
                            />
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="pr-4 pl-2">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={rowAllOn}
                            onCheckedChange={(checked) =>
                              setCells(
                                CHANNELS.map((ch) => [ch, category] as [Channel, Category]),
                                checked,
                              )
                            }
                            aria-label={`${meta.label} on every channel`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </FramePanel>
      </Frame>

      <SaveBar
        dirty={dirty}
        saving={saving}
        saved={saved}
        disabled={loading}
        onSave={save}
        onDiscard={() => setMatrix(savedMatrix)}
      />
    </div>
  );
}
