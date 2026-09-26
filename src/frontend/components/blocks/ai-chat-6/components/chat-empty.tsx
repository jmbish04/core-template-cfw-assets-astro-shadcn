import { IconStack } from "@/components/reui/icon-stack"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ORG_NAME } from "./data"
import { BotIcon } from "lucide-react"

/** New chat parks the panel here. The starters sit above the composer, so this
    says only what the next answer is allowed to read. */
export function ChatEmpty({ contextCount }: { contextCount: number }) {
  return (
    // Centred while it fits, scrollable once a short panel cannot hold it.
    // `m-auto` centres without clipping the way justify-center does.
    <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <Empty className="m-auto w-full flex-none p-0">
        <EmptyHeader>
          <EmptyMedia className="mb-0">
            <IconStack aria-hidden="true" className="h-16 w-14">
              <BotIcon strokeWidth="1.9" className="size-3.5" aria-hidden="true" />
            </IconStack>
          </EmptyMedia>
          {/* One step above the widget labels and level with an answer title,
              so the zero state reads as the top of the panel. */}
          <EmptyTitle className="text-base">New Chat</EmptyTitle>
          <EmptyDescription className="tabular-nums">
            {contextCount
              ? `Reading ${contextCount} ${ORG_NAME} ${contextCount === 1 ? "source" : "sources"}, nothing asked yet.`
              : `Nothing in context yet. Add a ${ORG_NAME} source to begin.`}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}