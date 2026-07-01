/**
 * @fileoverview TaskAttachments — the real Attachments list for the task
 * viewport, backed by `GET/POST/GET-stream/DELETE
 * /api/tasks/{id}/attachments`.
 *
 * Each row shows a file-type icon, filename, human-readable size, and ghost
 * view/download/delete icon buttons. View + download both hit the streaming GET
 * route (`/api/tasks/{id}/attachments/{attId}`) — view opens it in a new tab,
 * download forces a `download` attribute. Uploads go through a hidden file input
 * that POSTs multipart form-data; the returned metadata row is appended. Bytes
 * live in R2; this component only ever sees metadata.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DownloadIcon,
  EyeIcon,
  FileArchiveIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { humanSize } from "@/lib/format";

import { ErrorState } from "./Shared";
import type { TaskAttachment } from "./types";

export interface TaskAttachmentsProps {
  taskId: string;
}

/** Pick a lucide icon component for an attachment based on its MIME / name. */
function iconFor(att: TaskAttachment) {
  const type = att.contentType ?? "";
  const name = att.filename.toLowerCase();
  if (type.startsWith("image/")) return FileImageIcon;
  if (type.startsWith("text/") || type === "application/json" || name.endsWith(".md")) {
    return FileTextIcon;
  }
  if (/\.(zip|tar|gz|rar|7z)$/.test(name) || type.includes("zip")) return FileArchiveIcon;
  if (type === "application/pdf" || name.endsWith(".pdf")) return FileTextIcon;
  return FileIcon;
}

/** Attachments list + uploader card for a single task. */
export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ data: TaskAttachment[] }>(`tasks/${taskId}/attachments`);
      setAttachments(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load attachments.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        // Multipart upload — bypass the JSON apiSend helper and post FormData
        // directly so the browser sets the multipart boundary.
        const res = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const text = await res.text();
          let message = `Upload failed (${res.status})`;
          try {
            const parsed = text ? JSON.parse(text) : null;
            if (parsed && typeof parsed === "object" && "error" in parsed) {
              message = String((parsed as { error: unknown }).error);
            }
          } catch {
            /* keep default message */
          }
          throw new ApiError(res.status, message);
        }
        const created = (await res.json()) as TaskAttachment;
        setAttachments((prev) => [...prev, created]);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to upload file.");
      } finally {
        setUploading(false);
      }
    },
    [taskId],
  );

  const remove = useCallback(
    async (att: TaskAttachment) => {
      const prev = attachments;
      setAttachments(attachments.filter((a) => a.id !== att.id));
      try {
        await apiSend<{ ok: boolean }>("DELETE", `tasks/${taskId}/attachments/${att.id}`);
      } catch (e) {
        setAttachments(prev);
        setError(e instanceof ApiError ? e.message : "Failed to delete attachment.");
      }
    },
    [attachments, taskId],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">
            Attachments
            {attachments.length > 0 ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {attachments.length}
              </span>
            ) : null}
          </CardTitle>
          <input
            ref={inputRef}
            type="file"
            aria-label="Upload attachment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon className="size-4" />
            {uploading ? "Uploading…" : "Add"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading attachments…</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No attachments yet. Use “Add” to upload a file.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {attachments.map((att) => {
              const Icon = iconFor(att);
              const href = `/api/tasks/${taskId}/attachments/${att.id}`;
              return (
                <li
                  key={att.id}
                  className="group/att flex items-center gap-3 rounded-md border border-border/40 px-3 py-2"
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{att.filename}</span>
                    {att.size != null ? (
                      <span className="text-xs text-muted-foreground">{humanSize(att.size)}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      render={
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`View ${att.filename}`}
                        />
                      }
                    >
                      <EyeIcon className="size-4" />
                      <span className="sr-only">View {att.filename}</span>
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      render={
                        <a
                          href={href}
                          download={att.filename}
                          aria-label={`Download ${att.filename}`}
                        />
                      }
                    >
                      <DownloadIcon className="size-4" />
                      <span className="sr-only">Download {att.filename}</span>
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete ${att.filename}`}
                      onClick={() => void remove(att)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
