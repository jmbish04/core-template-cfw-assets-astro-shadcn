/**
 * @fileoverview The voice surface's own transcript.
 *
 * The shared `Transcript` renders every assistant body as Markdown, which is
 * right for eleven of the twelve surfaces and wrong for this one: here the
 * model chooses the answer's SHAPE, so the body goes through
 * `StructuredAnswer` instead. Everything else — the reasoning fold, the turn
 * receipt, the Stop control, the reply receipt — is the shared layer's.
 */
import type { ReactNode } from "react";

import { ReasoningFold, ReplyReceipt, TurnReceipt } from "@/components/chat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageAvatar, MessageContent, MessageFooter } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { UseChatThread } from "@/lib/chat";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SparklesIcon, SquareIcon } from "lucide-react";

import { StructuredAnswer } from "./structured-answer";

export interface AnswerThreadProps {
  chat: UseChatThread;
  /** Shown instead of the turns when the thread is empty. */
  empty?: ReactNode;
  /** Classes for the scrolling column — the widen toggle sets its width here. */
  contentClassName?: string;
}

/**
 * Render the thread with structured assistant answers.
 *
 * @param props The chat state plus the empty state and column width.
 * @returns The scrolling conversation body.
 */
export function AnswerThread({ chat, empty, contentClassName }: AnswerThreadProps) {
  const lastAssistantId = [...chat.messages].reverse().find((m) => m.role === "assistant")?.id;

  if (chat.loading && chat.messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6 p-6" aria-hidden="true">
        <Skeleton className="h-16 w-3/4 self-end" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (chat.messages.length === 0 && !chat.streaming && empty) {
    return <div className="flex min-h-0 flex-1 flex-col">{empty}</div>;
  }

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport className="scrollbar">
          <MessageScrollerContent
            aria-busy={chat.streaming}
            className={cn("mx-auto flex w-full min-w-0 flex-col gap-6 px-4 py-6 sm:px-6", contentClassName)}
          >
            {chat.messages.map((message) =>
              message.role === "user" ? (
                <MessageScrollerItem key={message.id} messageId={message.id}>
                  <Message align="end" role="group" aria-label="You">
                    <MessageAvatar>
                      <Avatar>
                        <AvatarFallback className="text-xs">You</AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent className="min-w-0 gap-1">
                      <BubbleGroup className="w-full items-end">
                        <Bubble variant="muted" align="end">
                          <BubbleContent className="whitespace-pre-wrap">{message.content}</BubbleContent>
                        </Bubble>
                      </BubbleGroup>
                      <MessageFooter className="gap-0.5 pe-0">
                        <span className="text-muted-foreground pe-1 text-xs tabular-nums">
                          {relativeTime(message.createdAt)}
                        </span>
                      </MessageFooter>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ) : (
                <MessageScrollerItem key={message.id} messageId={message.id}>
                  <Message role="group" aria-label="Assistant">
                    <MessageAvatar className="translate-y-0! self-start">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          <SparklesIcon className="size-3.5" aria-hidden="true" />
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent className="min-w-0 gap-1">
                      <Bubble variant="ghost" className="w-full min-w-0">
                        <BubbleContent className="min-w-0">
                          {/* The quote pill used elsewhere anchors to this attribute. */}
                          <div data-answer-body>
                            <StructuredAnswer text={message.content} />
                          </div>
                        </BubbleContent>
                      </Bubble>
                      <MessageFooter className="flex-wrap gap-1">
                        <span className="text-muted-foreground pe-1 text-xs tabular-nums">
                          {relativeTime(message.createdAt)}
                        </span>
                        <ReplyReceipt message={message} />
                        {message.id === lastAssistantId && !chat.streaming && (
                          <TurnReceipt latencyMs={chat.latencyMs} usage={chat.usage} />
                        )}
                      </MessageFooter>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ),
            )}

            {chat.streaming && (
              <MessageScrollerItem scrollAnchor={false}>
                <Message role="group" aria-label="Assistant">
                  <MessageAvatar className="translate-y-0! self-start">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        <SparklesIcon className="size-3.5" aria-hidden="true" />
                      </AvatarFallback>
                    </Avatar>
                  </MessageAvatar>
                  <MessageContent className="min-w-0 gap-1">
                    <ReasoningFold reasoning={chat.reasoning} live={!chat.pending} defaultOpen={!chat.pending} />
                    {chat.pending ? (
                      <Bubble variant="ghost" className="w-full min-w-0">
                        <BubbleContent className="min-w-0">
                          {/* Mid-stream the JSON fence is usually unclosed, so
                              the parser falls back to text until it closes. */}
                          <div data-answer-body>
                            <StructuredAnswer text={chat.pending} />
                          </div>
                        </BubbleContent>
                      </Bubble>
                    ) : chat.reasoning ? null : (
                      <Marker>
                        <MarkerIcon>
                          <Spinner />
                        </MarkerIcon>
                        <MarkerContent className="shimmer">
                          {chat.routed?.model ? `Routing to ${chat.routed.model}` : "Thinking"}
                        </MarkerContent>
                      </Marker>
                    )}
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            )}

            {chat.streaming && (
              <MessageScrollerItem scrollAnchor={false}>
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={chat.stop} className="gap-1.5 rounded-full">
                    <SquareIcon className="size-3 fill-current" aria-hidden="true" />
                    Stop
                  </Button>
                </div>
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        {/* aria-busy silences the log, so the wait is announced from outside it. */}
        <p role="status" aria-live="polite" className="sr-only">
          {chat.streaming ? "Generating a reply" : ""}
        </p>

        <MessageScrollerButton variant="outline" size="icon-sm" className="bottom-4 rounded-full shadow-sm" />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
