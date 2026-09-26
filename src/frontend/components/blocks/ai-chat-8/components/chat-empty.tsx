import { IconStack } from "@/components/reui/icon-stack"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { STARTERS, VIEWER } from "./data"
import { SparklesIcon } from "lucide-react"

/** Greeted by first name, the way a person who knows you would. */
const FIRST_NAME = VIEWER.name.split(" ")[0]

/** New chat parks the panel here. Every chip sends a real prompt, so the zero
    state is a way in rather than a poster. */
export function ChatEmpty({ onSend }: { onSend: (prompt: string) => void }) {
  return (
    // Centred while it fits, scrollable once the chips outgrow a short panel.
    // `m-auto` centres without clipping the way justify-center does.
    <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="m-auto flex w-full flex-col gap-6">
        <Empty className="flex-none p-0">
          <EmptyHeader>
            <EmptyMedia className="mb-0">
              <IconStack aria-hidden="true" className="h-16 w-14">
                <SparklesIcon strokeWidth="1.9" className="size-3.5" aria-hidden="true" />
              </IconStack>
            </EmptyMedia>
            <EmptyTitle>
              <span className="text-muted-foreground block text-sm font-normal">
                Hi {FIRST_NAME},
              </span>
              What Is Moving Today?
            </EmptyTitle>
          </EmptyHeader>
        </Empty>

        <div className="flex flex-wrap justify-center gap-2">
          {STARTERS.map((starter) => (
            <Button
              key={starter.id}
              variant="outline"
              size="sm"
              onClick={() => onSend(starter.prompt)}
              className="text-muted-foreground hover:text-foreground gap-1.5 font-normal"
            >
              {starter.icon}
              {starter.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}