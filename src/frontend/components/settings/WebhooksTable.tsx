/**
 * @fileoverview WebhooksTable — outbound webhook endpoints, built on ReUI
 * settings-8 (Frame of endpoint Item rows with delivery-health alert
 * indicators, status badge, copyable URL, enable Switch and an actions menu).
 *
 * The block's StatusIndicator, EndpointAlertIndicator and EndpointUrlCopy are
 * reused as-is; this file maps real `/api/webhooks` rows onto them:
 *   - GET    /api/webhooks            – list (first 100)
 *   - POST   /api/webhooks            – create (editor dialog / sheet)
 *   - PATCH  /api/webhooks/{id}       – edit + inline enable toggle
 *   - DELETE /api/webhooks/{id}       – delete (AlertDialog confirmation)
 *   - POST   /api/webhooks/{id}/test  – simulate a delivery
 *
 * Health is derived from `active`, `lastStatus` and `lastTriggeredAt`; the API
 * has no delivery history, so alerts describe the most recent delivery only.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  WebhookIcon,
} from "lucide-react";

import { EndpointAlertIndicator } from "@/components/blocks/settings-8/components/endpoint-alert-indicator";
import { EndpointUrlCopy } from "@/components/blocks/settings-8/components/endpoint-url-copy";
import { StatusIndicator } from "@/components/blocks/settings-8/components/status-indicator";
import type {
  EndpointAlert,
  EndpointStatus,
} from "@/components/blocks/settings-8/components/data";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

import { apiGet, ApiError, apiSend } from "@/lib/api";
import { relativeTime } from "@/lib/format";

import { InlineError } from "./shared";

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  active: boolean;
  lastStatus: string | null;
  lastTriggeredAt: string | number | Date | null;
  createdAt: string | number | Date;
}

interface WebhookListResponse {
  data: Webhook[];
  total: number;
}

interface TestResponse {
  ok: boolean;
  lastStatus: string;
  lastTriggeredAt: number | null;
}

/** Editable draft used by the add/edit form. */
interface WebhookDraft {
  name: string;
  url: string;
  events: string;
  active: boolean;
}

const EMPTY_DRAFT: WebhookDraft = { name: "", url: "", events: "", active: true };

/** Split a comma/space separated events string into a clean array. */
function parseEvents(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function errMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

// ---------------------------------------------------------------------------
// Health mapping onto the settings-8 status + alert model
// ---------------------------------------------------------------------------

function endpointStatus(wh: Webhook): EndpointStatus {
  if (!wh.active) return "disabled";
  if (wh.lastStatus && !wh.lastStatus.startsWith("2")) return "failing";
  return "active";
}

function endpointAlerts(wh: Webhook): EndpointAlert[] {
  if (wh.lastStatus && !wh.lastStatus.startsWith("2")) {
    return [
      {
        id: "failing",
        tone: "critical",
        badgeLabel: "Failing",
        detail: `Last delivery returned ${wh.lastStatus}. Fix the endpoint, then send a test.`,
      },
    ];
  }
  if (!wh.active) {
    return [
      {
        id: "paused",
        tone: "warning",
        badgeLabel: "Paused",
        detail: `${wh.name} is paused and not receiving new events.`,
      },
    ];
  }
  if (!wh.lastTriggeredAt) {
    return [
      {
        id: "untested",
        tone: "warning",
        badgeLabel: "No deliveries",
        detail: "Nothing has been delivered yet. Send a test to confirm the endpoint responds.",
      },
    ];
  }
  return [
    {
      id: "healthy",
      tone: "success",
      badgeLabel: "Healthy",
      detail: `Last delivery ${relativeTime(wh.lastTriggeredAt)} returned ${wh.lastStatus ?? "OK"}.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Endpoint row (settings-8 EndpointRow grammar)
// ---------------------------------------------------------------------------

function EndpointRow({
  wh,
  testing,
  onToggle,
  onTest,
  onEdit,
  onDelete,
}: {
  wh: Webhook;
  testing: boolean;
  onToggle: (active: boolean) => void;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const events =
    wh.events.length === 0
      ? "No events"
      : wh.events.length <= 2
        ? wh.events.join(", ")
        : `${wh.events.slice(0, 2).join(", ")} +${wh.events.length - 2}`;

  return (
    <Item className="rounded-none border-0">
      <ItemMedia variant="icon" className="hidden translate-y-0! self-center! sm:flex">
        <span className="border-border flex size-10 items-center justify-center rounded-md border [&_svg]:opacity-60">
          <WebhookIcon aria-hidden="true" />
        </span>
      </ItemMedia>

      <ItemContent className="min-w-0 gap-1">
        <ItemTitle className="min-w-0 gap-2">
          <span className="min-w-0 truncate">{wh.name}</span>
          <span className="flex shrink-0 items-center gap-1">
            {endpointAlerts(wh).map((alert) => (
              <EndpointAlertIndicator key={alert.id} alert={alert} />
            ))}
          </span>
          <StatusIndicator status={endpointStatus(wh)} />
        </ItemTitle>
        <ItemDescription className="min-w-0">
          <EndpointUrlCopy endpointName={wh.name} url={wh.url} />
        </ItemDescription>
        <ItemDescription className="min-w-0 truncate text-xs">
          {events} · {wh.lastTriggeredAt ? `last delivery ${relativeTime(wh.lastTriggeredAt)}` : "never delivered"}
        </ItemDescription>
      </ItemContent>

      <ItemActions className="gap-2 self-start sm:self-center">
        <Switch
          checked={wh.active}
          onCheckedChange={onToggle}
          aria-label={`Enable ${wh.name}`}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Open actions for ${wh.name}`}
              >
                <EllipsisVerticalIcon aria-hidden="true" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onTest} disabled={testing}>
                <SendIcon aria-hidden="true" />
                {testing ? "Sending test…" : "Send test delivery"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <PencilIcon aria-hidden="true" />
                Edit endpoint
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2Icon aria-hidden="true" />
                Remove endpoint
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WebhooksTable() {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WebhookDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<WebhookListResponse>("webhooks", { limit: 100 });
      setRows(res.data);
    } catch (e) {
      setError(errMessage(e, "Couldn't load webhooks. Refresh the page to try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const replaceRow = (id: string, next: Partial<Webhook>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));

  // --- Add / edit ----------------------------------------------------------

  const openCreate = useCallback(() => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setEditorError(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((wh: Webhook) => {
    setEditingId(wh.id);
    setDraft({ name: wh.name, url: wh.url, events: wh.events.join(", "), active: wh.active });
    setEditorError(null);
    setEditorOpen(true);
  }, []);

  const submitDraft = useCallback(async () => {
    setSubmitting(true);
    setEditorError(null);
    try {
      const body = {
        name: draft.name.trim(),
        url: draft.url.trim(),
        events: parseEvents(draft.events),
        active: draft.active,
      };
      if (editingId) {
        const updated = await apiSend<Webhook>("PATCH", `webhooks/${editingId}`, body);
        setRows((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      } else {
        const created = await apiSend<Webhook>("POST", "webhooks", body);
        setRows((prev) => [created, ...prev]);
      }
      setEditorOpen(false);
    } catch (e) {
      setEditorError(errMessage(e, "Couldn't save the webhook. Check the URL and try again."));
    } finally {
      setSubmitting(false);
    }
  }, [draft, editingId]);

  // --- Enable toggle (optimistic PATCH) -----------------------------------

  const toggleActive = useCallback(async (wh: Webhook, active: boolean) => {
    replaceRow(wh.id, { active });
    try {
      const updated = await apiSend<Webhook>("PATCH", `webhooks/${wh.id}`, { active });
      setRows((prev) => prev.map((r) => (r.id === wh.id ? updated : r)));
    } catch (e) {
      replaceRow(wh.id, { active: !active });
      setError(errMessage(e, `Couldn't ${active ? "enable" : "pause"} ${wh.name}. Try again.`));
    }
  }, []);

  // --- Delete --------------------------------------------------------------

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiSend<{ ok: boolean }>("DELETE", `webhooks/${deleteTarget.id}`);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setError(errMessage(e, "Couldn't delete the webhook. Try again."));
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  // --- Test ----------------------------------------------------------------

  const testWebhook = useCallback(async (wh: Webhook) => {
    setTestingId(wh.id);
    setError(null);
    try {
      const res = await apiSend<TestResponse>("POST", `webhooks/${wh.id}/test`);
      replaceRow(wh.id, { lastStatus: res.lastStatus, lastTriggeredAt: res.lastTriggeredAt });
    } catch (e) {
      setError(errMessage(e, `Test delivery to ${wh.name} failed. Check the endpoint and try again.`));
    } finally {
      setTestingId(null);
    }
  }, []);

  // --- Editor body (shared by the desktop Dialog and the mobile Sheet) ----

  const editorTitle = editingId ? "Edit webhook" : "Add webhook";
  const editorDescription = editingId
    ? "Update this webhook's destination and event subscriptions."
    : "Register a new outbound endpoint. A signing secret is generated automatically.";
  const editorFields = (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="wh-name">Name</Label>
        <Input
          id="wh-name"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Deploy notifier"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="wh-url">Endpoint URL</Label>
        <Input
          id="wh-url"
          value={draft.url}
          onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
          placeholder="https://example.com/hooks/incoming"
          spellCheck={false}
          className="font-mono"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="wh-events">Events</Label>
        <Input
          id="wh-events"
          value={draft.events}
          onChange={(e) => setDraft((d) => ({ ...d, events: e.target.value }))}
          placeholder="task.created, project.updated"
          spellCheck={false}
        />
        <p className="text-muted-foreground text-xs">Comma- or space-separated event types.</p>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="wh-active">Enabled</Label>
        <Switch
          id="wh-active"
          checked={draft.active}
          onCheckedChange={(checked) => setDraft((d) => ({ ...d, active: checked }))}
        />
      </div>
      <InlineError message={editorError} />
    </div>
  );
  const editorActions = (
    <>
      <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={submitting}>
        Cancel
      </Button>
      <Button
        onClick={submitDraft}
        disabled={submitting || !draft.name.trim() || !draft.url.trim()}
      >
        {submitting ? "Saving…" : editingId ? "Save changes" : "Create webhook"}
      </Button>
    </>
  );

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <InlineError message={error} />

      <Frame>
        <FrameHeader className="flex-row items-center justify-between gap-4 px-2! py-2.5!">
          <div className="space-y-px">
            <FrameTitle>Webhook endpoints</FrameTitle>
            <FrameDescription>
              {loading ? "Routes and status" : `${rows.length} ${rows.length === 1 ? "route" : "routes"} and their delivery health`}
            </FrameDescription>
          </div>
          <Button onClick={openCreate}>
            <PlusIcon aria-hidden="true" />
            Add endpoint
          </Button>
        </FrameHeader>

        <FramePanel className="p-0!">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WebhookIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No webhooks yet</EmptyTitle>
                <EmptyDescription>
                  Add an endpoint to start receiving event payloads.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={openCreate}>
                  <PlusIcon aria-hidden="true" />
                  Add your first endpoint
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            rows.map((wh, index) => (
              <div key={wh.id}>
                {index > 0 ? <Separator /> : null}
                <EndpointRow
                  wh={wh}
                  testing={testingId === wh.id}
                  onToggle={(active) => void toggleActive(wh, active)}
                  onTest={() => void testWebhook(wh)}
                  onEdit={() => openEdit(wh)}
                  onDelete={() => setDeleteTarget(wh)}
                />
              </div>
            ))
          )}
        </FramePanel>
      </Frame>

      {/* Add / edit: Dialog on desktop, bottom Sheet on mobile ----------- */}
      {isMobile ? (
        <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
          <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle>{editorTitle}</SheetTitle>
              <SheetDescription>{editorDescription}</SheetDescription>
            </SheetHeader>
            <div className="px-4">{editorFields}</div>
            <SheetFooter>{editorActions}</SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editorTitle}</DialogTitle>
              <DialogDescription>{editorDescription}</DialogDescription>
            </DialogHeader>
            {editorFields}
            <DialogFooter>{editorActions}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation -------------------------------------------- */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="text-foreground font-medium">{deleteTarget?.name}</span>. Events
              subscribed to this endpoint will stop being delivered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
