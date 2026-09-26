/**
 * @fileoverview AdvancedPanel — system status, maintenance and danger zone,
 * built on ReUI settings-10 (stacked Frame cards of Item rows with badges).
 *
 *   - System: read-only `GET /api/ping` status.
 *   - Maintenance: "Reset appearance" → PUT /api/settings/preferences with the
 *     theme/density defaults (a soft reset).
 *   - Danger zone: "Clear all notifications" → DELETE /api/notifications,
 *     gated behind an AlertDialog.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import { RefreshCwIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/reui/badge";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { apiGet, ApiError, apiSend } from "@/lib/api";
import { relativeTime, shortDate } from "@/lib/format";

import {
  InlineError,
  NOTIFICATIONS_CHANGED,
  SavedFlash,
  SettingRow,
  SettingsRows,
  useSavedFlash,
} from "./shared";

interface PingResponse {
  status: string;
  timestamp: number;
}

/** Default appearance values mirrored from the preferences schema defaults. */
const APPEARANCE_DEFAULTS = {
  theme: "system",
  accentColor: "#6366f1",
  fontSize: "md",
  density: "comfortable",
};

function errMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

export function AdvancedPanel() {
  const [ping, setPing] = useState<PingResponse | null>(null);
  const [pingLoading, setPingLoading] = useState(true);
  const [pingError, setPingError] = useState<string | null>(null);

  const [resetting, setResetting] = useState(false);
  const [reset, flashReset] = useSavedFlash();

  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, flashCleared] = useSavedFlash();
  const [actionError, setActionError] = useState<string | null>(null);

  const loadPing = useCallback(async () => {
    setPingLoading(true);
    setPingError(null);
    try {
      setPing(await apiGet<PingResponse>("ping"));
    } catch (e) {
      setPingError(errMessage(e, "Couldn't reach the API. Check your connection and refresh."));
    } finally {
      setPingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPing();
  }, [loadPing]);

  const resetAppearance = useCallback(async () => {
    setResetting(true);
    setActionError(null);
    try {
      await apiSend("PUT", "settings/preferences", APPEARANCE_DEFAULTS);
      flashReset();
    } catch (e) {
      setActionError(errMessage(e, "Couldn't reset appearance. Try again."));
    } finally {
      setResetting(false);
    }
  }, [flashReset]);

  const clearNotifications = useCallback(async () => {
    setClearing(true);
    setActionError(null);
    try {
      await apiSend<{ ok: boolean }>("DELETE", "notifications");
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
      setClearOpen(false);
      flashCleared();
    } catch (e) {
      setActionError(errMessage(e, "Couldn't clear notifications. Try again."));
    } finally {
      setClearing(false);
    }
  }, [flashCleared]);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <InlineError message={actionError} />

      {/* System ------------------------------------------------------------- */}
      <Frame>
        <FrameHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-px">
            <FrameTitle>System</FrameTitle>
            <FrameDescription>Status reported by the Worker edge runtime.</FrameDescription>
          </div>
          <Button size="sm" variant="outline" onClick={loadPing} disabled={pingLoading}>
            <RefreshCwIcon aria-hidden="true" />
            {pingLoading ? "Checking…" : "Refresh"}
          </Button>
        </FrameHeader>
        <FramePanel className="p-0!">
          {pingError ? (
            <div className="p-4">
              <InlineError message={pingError} />
            </div>
          ) : pingLoading || !ping ? (
            <div className="p-4">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <SettingsRows>
              <SettingRow
                title="API status"
                description="Result of GET /api/ping."
                control={
                  <Badge variant={ping.status === "ok" ? "success-light" : "destructive-light"}>
                    {ping.status === "ok" ? "Operational" : ping.status}
                  </Badge>
                }
              />
              <SettingRow
                title="Server clock"
                description="Timestamp returned with the last ping."
                control={
                  <span className="text-sm tabular-nums">
                    {shortDate(ping.timestamp)} · {relativeTime(ping.timestamp)}
                  </span>
                }
              />
            </SettingsRows>
          )}
        </FramePanel>
      </Frame>

      {/* Maintenance -------------------------------------------------------- */}
      <Frame>
        <FrameHeader>
          <FrameTitle>Maintenance</FrameTitle>
          <FrameDescription>Soft resets that restore default state.</FrameDescription>
        </FrameHeader>
        <FramePanel className="p-0!">
          <SettingRow
            title={
              <>
                Reset appearance
                <SavedFlash show={reset} label="Reset" />
              </>
            }
            description="Restore theme, accent, font size, and density to their defaults."
            control={
              <Button size="sm" variant="outline" onClick={resetAppearance} disabled={resetting}>
                <RotateCcwIcon aria-hidden="true" />
                {resetting ? "Resetting…" : "Reset"}
              </Button>
            }
          />
        </FramePanel>
      </Frame>

      {/* Danger zone -------------------------------------------------------- */}
      <Frame className="[--frame-border-color:color-mix(in_oklch,var(--color-destructive)_35%,transparent)]">
        <FrameHeader>
          <FrameTitle className="text-destructive">Danger zone</FrameTitle>
          <FrameDescription>These actions take effect immediately and can't be undone.</FrameDescription>
        </FrameHeader>
        <FramePanel className="p-0!">
          <SettingRow
            title={
              <>
                Clear all notifications
                <SavedFlash show={cleared} label="Cleared" />
              </>
            }
            description="Permanently removes every notification from the feed."
            control={
              <Button size="sm" variant="destructive" onClick={() => setClearOpen(true)}>
                <Trash2Icon aria-hidden="true" />
                Clear notifications
              </Button>
            }
          />
        </FramePanel>
      </Frame>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every notification from the feed. It can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={clearNotifications} disabled={clearing}>
              {clearing ? "Clearing…" : "Clear notifications"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
