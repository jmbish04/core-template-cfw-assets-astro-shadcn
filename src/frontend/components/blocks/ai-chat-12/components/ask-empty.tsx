import { IconStack } from "@/components/reui/icon-stack"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ARTICLES, STARTERS } from "./data"
import { BookOpenIcon } from "lucide-react"

/** Every chip sends a real question, so the zero state is a way in rather
    than a poster. The count is the promise the panel is making. */
export function AskEmpty({ onSend }: { onSend: (prompt: string) => void }) {
  return (
    // Centred while it fits, scrollable once the chips outgrow a short panel.
    // `m-auto` centres without clipping the way justify-center does.
    <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-16 pb-4">
      <div className="m-auto flex w-full flex-col gap-6">
        <Empty className="flex-none p-0">
          <EmptyHeader>
            <EmptyMedia className="mb-0">
              <IconStack aria-hidden="true" className="h-16 w-14">
                <BookOpenIcon strokeWidth="1.9" className="size-3.5" aria-hidden="true" />
              </IconStack>
            </EmptyMedia>
            <EmptyTitle>Ask The Docs</EmptyTitle>
            <EmptyDescription>
              Answers drawn from {ARTICLES.length} help articles.
            </EmptyDescription>
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