/**
 * @fileoverview SendTestNotification — composer that POSTs to /api/notifications,
 * in a ReUI Frame (settings form grammar: FrameHeader + FramePanel fields).
 *
 * After a successful POST it fires the `notifications:changed` window event so
 * the NotificationsFeed on the same page refetches immediately instead of
 * waiting for its next poll.
 */

"use client";

import { useCallback, useState } from "react";

import { SendIcon } from "lucide-react";

import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiSend, ApiError } from "@/lib/api";

import { InlineError, NOTIFICATIONS_CHANGED, SavedFlash, useSavedFlash } from "./shared";

type NotificationType = "info" | "success" | "warning" | "error" | "mention" | "system";

const TYPE_OPTIONS: { value: NotificationType; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "mention", label: "Mention" },
  { value: "system", label: "System" },
];

export function SendTestNotification() {
  const [type, setType] = useState<NotificationType>("info");
  const [title, setTitle] = useState("Test notification");
  const [body, setBody] = useState("Sent from the notifications page.");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, flashSent] = useSavedFlash();

  const send = useCallback(async () => {
    setSending(true);
    setError(null);
    try {
      await apiSend("POST", "notifications", {
        type,
        title: title.trim() || "Test notification",
        body: body.trim() || null,
        actor: "you",
      });
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
      flashSent();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Couldn't send the notification. Try again.",
      );
    } finally {
      setSending(false);
    }
  }, [type, title, body, flashSent]);

  return (
    <Frame>
      <FrameHeader>
        <FrameTitle>Send a test notification</FrameTitle>
        <FrameDescription>Posts to the notifications API; it lands in the inbox right away.</FrameDescription>
      </FrameHeader>
      <FramePanel className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <div className="grid gap-1.5">
            <Label htmlFor="notif-type">Type</Label>
            <Select
              items={TYPE_OPTIONS}
              value={type}
              onValueChange={(v) => typeof v === "string" && setType(v as NotificationType)}
            >
              <SelectTrigger id="notif-type" className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notif-title">Title</Label>
            <Input
              id="notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="notif-body">Body</Label>
          <Input
            id="notif-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Optional message body"
          />
        </div>

        <InlineError message={error} />

        <div className="flex items-center gap-3">
          <Button onClick={send} disabled={sending}>
            <SendIcon aria-hidden="true" />
            {sending ? "Sending…" : "Send test notification"}
          </Button>
          <SavedFlash show={sent} label="Sent" />
        </div>
      </FramePanel>
    </Frame>
  );
}
