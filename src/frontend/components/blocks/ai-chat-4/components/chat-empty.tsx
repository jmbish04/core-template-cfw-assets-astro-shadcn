import { IconStack } from "@/components/reui/icon-stack"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ORG_NAME, THREADS } from "./data"
import { BotIcon, MessageSquareIcon } from "lucide-react"

/** New chat parks the panel here. The starters live in the palette above the
    composer, so this offers the one thing the palette cannot: a way back. */
export function ChatEmpty({ onResume }: { onResume: (id: string) => void }) {
  return (
    // Centred while it fits, scrollable once the list outgrows a short panel.
    // `m-auto` centres without clipping the way justify-center does.
    <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="m-auto flex w-full flex-col gap-6">
        <Empty className="flex-none p-0">
          <EmptyHeader>
            <EmptyMedia className="mb-0">
              <IconStack aria-hidden="true" className="h-16 w-14">
                <BotIcon strokeWidth="1.9" className="size-3.5" aria-hidden="true" />
              </IconStack>
            </EmptyMedia>
            <EmptyTitle>New Chat</EmptyTitle>
            <EmptyDescription>
              Reading {ORG_NAME} research, nothing asked yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-xs">Recent</p>
          {THREADS.map((thread) => (
            <Button
              key={thread.id}
              variant="outline"
              onClick={() => onResume(thread.id)}
              className="h-auto w-full justify-start gap-2 px-2.5 py-2 text-start font-normal"
            >
              <MessageSquareIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {thread.title}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {thread.at}
              </span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}