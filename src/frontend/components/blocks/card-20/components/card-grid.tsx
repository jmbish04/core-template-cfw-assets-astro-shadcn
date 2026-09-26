import { Frame } from "@/components/reui/frame"

import { CardItem } from "./card-item"
import type { ICard } from "./data"

/** card-20: responsive grid of framed link cards. Data comes from the caller. */
export function CardGrid({ cards }: { cards: ICard[] }) {
  return (
    <Frame className="@container w-full">
      {/* Grid */}
      <div className="grid gap-1 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {cards.map((card) => (
          <CardItem key={card.title} card={card} />
        ))}
      </div>
    </Frame>
  )
}
