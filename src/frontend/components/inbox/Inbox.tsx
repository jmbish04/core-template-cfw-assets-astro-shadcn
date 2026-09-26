/**
 * @fileoverview Inbox — the two-pane Email Routing island.
 *
 * Layout comes from ReUI `app-shell-4`'s content area, rendered INSIDE the
 * global app-shell-12 (no second sidebar): a 440px message list column
 * (`MessageList`) beside a reading pane with an action header (`MessageView`),
 * both inside one dense ReUI Frame. The empty state reuses `empty-state-1`'s
 * records illustration.
 *
 * Data comes exclusively from `/api/inbox` via `@/lib/api` — every row is an
 * email stored by the Worker `email()` handler. When the inbox is empty we offer
 * "Load demo data" (`POST /api/inbox/seed`).
 *
 * Mobile (<768px): the list fills the frame; tapping a row opens the reader in
 * a full-width Sheet. Errors go through the centralized frontend error handler.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SparklesIcon } from "lucide-react";

import { RecordsEmptyIllustration } from "@/components/blocks/empty-state-1/components/records-empty-illustration";
import { FrontendErrorDialog } from "@/components/FrontendErrorDialog";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiGet, apiSend } from "@/lib/api";
import { useFrontendErrorHandler } from "@/lib/error-handler";

import { MessageList } from "./MessageList";
import { MessageView } from "./MessageView";
import type { EmailFolder, EmailMessage, InboxEnvelope, InboxView, SeedResponse } from "./types";
import { viewToQuery } from "./types";

const SOURCE_PAGE = { url: "/inbox", file: "src/frontend/pages/inbox.astro" };
const FILE = "src/frontend/components/inbox/Inbox.tsx";

export function Inbox() {
  const isMobile = useIsMobile();
  const { activeError, copyState, clearError, copyErrorPrompt, handleError } =
    useFrontendErrorHandler();

  const [view, setView] = useState<InboxView>("inbox");
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  /** Route a failed action through the central error handler. */
  const report = useCallback(
    (functionName: string, description: string, friendlyError: string, serverError: unknown) =>
      handleError({
        sourcePage: SOURCE_PAGE,
        codeSource: { file: FILE, functionName, description },
        errorDetails: { friendlyError, serverError },
      }),
    [handleError],
  );

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await apiGet<InboxEnvelope>("inbox", {
        ...viewToQuery(view),
        q: debouncedQ || undefined,
        limit: 100,
      });
      if (id !== reqId.current) return;
      setMessages(res.data);
      setUnread(res.unread);
      setLoadFailed(false);
    } catch (e) {
      if (id !== reqId.current) return;
      setLoadFailed(true);
      report("load", "Fetches the mailbox from GET /api/inbox.", "Couldn't load your mail. Check your connection and retry.", e);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [view, debouncedQ, report]);

  useEffect(() => {
    void load();
  }, [load]);

  /** PATCH one message; on failure revert via `rollback` and report. */
  const patch = useCallback(
    async (msg: EmailMessage, body: Partial<Pick<EmailMessage, "read" | "starred" | "folder">>, rollback: () => void) => {
      try {
        await apiSend<EmailMessage>("PATCH", `inbox/${msg.id}`, body);
        return true;
      } catch (e) {
        rollback();
        report("patch", "Updates a message via PATCH /api/inbox/{id}.", "Couldn't update that message. Retry in a moment.", e);
        return false;
      }
    },
    [report],
  );

  const setRead = useCallback(
    (msg: EmailMessage, read: boolean) => {
      const apply = (r: boolean) => {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: r } : m)));
        if (msg.folder === "inbox") setUnread((u) => Math.max(0, u + (r ? -1 : 1)));
      };
      apply(read);
      void patch(msg, { read }, () => apply(!read));
    },
    [patch],
  );

  const handleSelect = useCallback(
    (msg: EmailMessage) => {
      setSelectedId(msg.id);
      if (!msg.read) setRead(msg, true);
    },
    [setRead],
  );

  const markUnread = useCallback(
    (msg: EmailMessage) => {
      setSelectedId(null);
      setRead(msg, false);
    },
    [setRead],
  );

  const toggleStar = useCallback(
    async (msg: EmailMessage) => {
      const next = !msg.starred;
      const set = (s: boolean) =>
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, starred: s } : m)));
      set(next);
      const ok = await patch(msg, { starred: next }, () => set(msg.starred));
      // In the Starred view, un-starring removes the row.
      if (ok && view === "starred" && !next) {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        setSelectedId((id) => (id === msg.id ? null : id));
      }
    },
    [patch, view],
  );

  const moveFolder = useCallback(
    async (msg: EmailMessage, folder: EmailFolder) => {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      setSelectedId((id) => (id === msg.id ? null : id));
      await patch(msg, { folder }, () => {});
      void load();
    },
    [patch, load],
  );

  const seed = useCallback(async () => {
    setSeeding(true);
    try {
      await apiSend<SeedResponse>("POST", "inbox/seed");
      await load();
    } catch (e) {
      report("seed", "Seeds demo mail via POST /api/inbox/seed.", "Couldn't load demo data. Retry in a moment.", e);
    } finally {
      setSeeding(false);
    }
  }, [load, report]);

  const changeView = useCallback((next: InboxView) => {
    setView(next);
    setSelectedId(null);
  }, []);

  const index = messages.findIndex((m) => m.id === selectedId);
  const selected = index >= 0 ? messages[index]! : null;
  const prev = index > 0 ? messages[index - 1] : undefined;
  const next = index >= 0 && index < messages.length - 1 ? messages[index + 1] : undefined;
  const showSeed = view === "inbox" && !debouncedQ && !loadFailed;

  const empty = (
    <Empty className="border-0 py-12">
      <EmptyHeader>
        <EmptyMedia>
          <RecordsEmptyIllustration variant="compact" />
        </EmptyMedia>
        <EmptyTitle>
          {loadFailed ? "Mail didn't load" : debouncedQ ? "No matching mail" : "Nothing here yet"}
        </EmptyTitle>
        <EmptyDescription>
          {loadFailed
            ? "The inbox API didn't respond. Retry to fetch your mail."
            : showSeed
              ? "This inbox is wired to Cloudflare Email Routing. Load demo data, or send an email to a routed address."
              : debouncedQ
                ? "Try a different search term."
                : "Messages that match this view will appear here."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {loadFailed ? (
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        ) : showSeed ? (
          <Button size="sm" onClick={seed} disabled={seeding}>
            <SparklesIcon data-icon="inline-start" aria-hidden="true" />
            {seeding ? "Loading…" : "Load demo data"}
          </Button>
        ) : debouncedQ ? (
          <Button variant="outline" size="sm" onClick={() => setQ("")}>
            Clear search
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  );

  const reader = (
    <MessageView
      message={selected}
      onClose={isMobile ? () => setSelectedId(null) : undefined}
      onPrev={prev ? () => handleSelect(prev) : undefined}
      onNext={next ? () => handleSelect(next) : undefined}
      onToggleStar={toggleStar}
      onArchive={(m) => moveFolder(m, "archive")}
      onMoveToInbox={(m) => moveFolder(m, "inbox")}
      onMarkUnread={markUnread}
    />
  );

  return (
    <>
      <Frame dense className="min-h-[32rem] md:h-[calc(100svh-10rem)]">
        <FramePanel className="grid min-h-0 grid-cols-1 p-0 md:grid-cols-[440px_minmax(0,1fr)]">
          <div className="border-border flex min-h-0 flex-col md:border-r">
            <MessageList
              view={view}
              onViewChange={changeView}
              query={q}
              onQueryChange={setQ}
              messages={messages}
              unread={unread}
              selectedId={selectedId}
              loading={loading}
              onRefresh={load}
              onSelect={handleSelect}
              onToggleStar={toggleStar}
              empty={empty}
            />
          </div>
          <div className="hidden min-h-0 flex-col md:flex">{reader}</div>
        </FramePanel>
      </Frame>

      {/* Mobile: the reader is its own full-width view. */}
      <Sheet open={isMobile && selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-none">
          <SheetTitle className="sr-only">{selected?.subject ?? "Message"}</SheetTitle>
          {reader}
        </SheetContent>
      </Sheet>

      <FrontendErrorDialog
        error={activeError}
        copyState={copyState}
        onCopyPrompt={copyErrorPrompt}
        onOpenChange={(open) => !open && clearError()}
      />
    </>
  );
}
