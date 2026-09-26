import { Item } from "@/components/ui/item"

import { GREETING, STARTERS } from "./data"
import { ReuiMark } from "./reui-mark"

/** Identity and greeting above the ask box. Fixed to the demo clock in data. */
export function WelcomeHero() {
  return (
    // Centred on the ask box below it, so mark, greeting and field share one spine.
    <div className="flex flex-col items-center gap-5 text-center">
      <ReuiMark />

      {/* One line, one focal point. The ask box placeholder carries the
          invitation, so the greeting does not have to ask anything. */}
      <h1 className="text-3xl/9 font-medium tracking-tight text-balance">
        {GREETING}
      </h1>
    </div>
  )
}

/**
 * Three grounded asks under the composer. Each sends verbatim, so the answer
 * names the file it read rather than inventing one.
 */
export function StarterCards({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {STARTERS.map((starter) => (
        <Item
          key={starter.id}
          variant="outline"
          render={<button type="button" />}
          onClick={() => onPick(starter.prompt)}
          className="hover:bg-accent/50 h-full items-start text-start"
        >
          {/* The emphasised run is the card's focal point, so nothing competes
              with it above the line. */}
          <span className="text-muted-foreground text-sm/5">
            {starter.copy.map((segment, index) =>
              segment.strong ? (
                <strong
                  key={index}
                  className="text-foreground font-medium tabular-nums"
                >
                  {segment.text}
                </strong>
              ) : (
                <span key={index}>{segment.text}</span>
              )
            )}
          </span>
        </Item>
      ))}
    </div>
  )
}