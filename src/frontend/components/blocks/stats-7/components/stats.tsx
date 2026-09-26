import { Badge } from "@/components/reui/badge"
import { Frame, FramePanel } from "@/components/reui/frame"

import type { CardData } from "./data"

/** stats-7: three divided metric cells in one Frame. Data comes from the caller. */
export function Stats({ cards }: { cards: CardData[] }) {
  return (
    <Frame className="@container w-full grow">
      {/* Content */}
      <FramePanel className="bg-background border-border grid grid-cols-1 overflow-hidden rounded-xl border p-0! @3xl:grid-cols-3">
        {cards.map((card, i) => (
          <div
            key={i}
            className="border-border rounded-none border-0 border-y p-4 shadow-none @3xl:p-6 first:border-0 last:border-0 @3xl:border-x @3xl:border-y-0"
          >
            <div className="flex h-full flex-col justify-between space-y-6">
              <div className="space-y-0.25">
                <div className="text-foreground text-lg font-semibold">
                  {card.title}
                </div>
                <div className="text-muted-foreground text-sm">
                  {card.subtitle}
                </div>
              </div>

              <div className="flex flex-1 grow flex-col justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight @3xl:text-3xl">
                    {card.value}
                  </span>
                  <Badge variant={card.badge.color}>
                    {card.badge.icon}
                    {card.badge.text}
                  </Badge>
                </div>
                <div className="text-sm">{card.subtext}</div>
              </div>
            </div>
          </div>
        ))}
      </FramePanel>
    </Frame>
  )
}