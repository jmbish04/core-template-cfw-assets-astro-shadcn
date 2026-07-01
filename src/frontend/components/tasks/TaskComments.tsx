/**
 * @fileoverview TaskComments — the real Comments thread for the task viewport,
 * backed by `GET/POST /api/tasks/{id}/comments`.
 *
 * Renders each comment as an avatar-initials + name + relative-time header over
 * a muted bubble body, oldest→newest. Below the thread sits a composer: a
 * textarea (⌘/Ctrl+Enter to send) plus a Comment button. Posting optimistically
 * appends the new comment, then reconciles with the server row (or rolls back on
 * error). No data is fabricated — an empty thread shows an honest empty state.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { RichTextComposer } from "@/components/ui/rich-text-composer";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { relativeTime } from "@/lib/format";

import { ErrorState } from "./Shared";
import { initials, type TaskComment } from "./types";

export interface TaskCommentsProps {
  taskId: string;
}

/** Comments thread + composer for a single task. */
export function TaskComments({ taskId }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ data: TaskComment[] }>(`tasks/${taskId}/comments`);
      setComments(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load comments.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);

    // Optimistic append with a temporary id, reconciled on success.
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: TaskComment = {
      id: tempId,
      taskId,
      author: "You",
      body,
      createdAt: Date.now(),
    };
    setComments((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const saved = await apiSend<TaskComment>("POST", `tasks/${taskId}/comments`, { body });
      setComments((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
    } catch (e) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setDraft(body);
      setError(e instanceof ApiError ? e.message : "Failed to post comment.");
    } finally {
      setSending(false);
    }
  }, [draft, sending, taskId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Comments
          {comments.length > 0 ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{comments.length}</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comments…</p>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/20 px-4 py-8 text-center">
            <MessageSquareIcon className="size-6 text-muted-foreground" />
            <p className="max-w-xs text-xs text-muted-foreground">
              No comments yet. Start the discussion below.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-3">
                <Avatar size="sm" className="mt-0.5">
                  <AvatarFallback>{initials(comment.author)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{comment.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-3 py-2">
                    <Markdown>{comment.body}</Markdown>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Composer */}
        <RichTextComposer
          value={draft}
          onChange={setDraft}
          rows={3}
          placeholder="Write a comment…"
          onSubmit={() => void send()}
          submitLabel="Comment"
          submitting={sending}
          submitDisabled={!draft.trim()}
        />
      </CardContent>
    </Card>
  );
}
