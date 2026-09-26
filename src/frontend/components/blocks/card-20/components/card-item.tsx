import { Frame } from "@/components/reui/frame"
import { cn } from "@/lib/utils"

import { Item, ItemMedia } from "@/components/ui/item"
import type { ICard } from "./data"
import { ArrowRightIcon } from "lucide-react"

export function CardItem({ card }: { card: ICard }) {
  return (
    <Frame stacked className="bg-background gap-0 overflow-hidden p-0">
      <div className="flex flex-col gap-4 px-5 py-5">
        <Item
          className={cn(
            "p-0",
            "flex size-11 items-center justify-center rounded-lg [&_svg]:size-5",
            card.iconBg
          )}
        >
          <ItemMedia variant="icon" className="size-auto">
            {card.icon}
          </ItemMedia>
        </Item>
        <div className="flex flex-col gap-4">
          <a
            href={card.href}
            className="text-foreground hover:text-primary block text-sm leading-tight font-medium"
          >
            {card.title}
          </a>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {card.description}
          </p>
        </div>
      </div>
      <div className="w-full">
        <nav className="flex flex-col" aria-label={card.title}>
          {card.guides.map((guide) => (
            <div key={guide.label} className="group border-border/60 border-t">
              <a
                href={guide.href}
                className="text-foreground group-hover:bg-muted/60 group-hover:text-primary flex w-full items-center justify-between gap-2 px-5 py-3 text-xs leading-relaxed transition-colors"
              >
                <span>{guide.label}</span>
                <ArrowRightIcon aria-hidden="true" className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors" />
              </a>
            </div>
          ))}
        </nav>
      </div>
    </Frame>
  )
}