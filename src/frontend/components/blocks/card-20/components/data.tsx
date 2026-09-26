/**
 * @fileoverview Card shape for the card-20 block (ReUI Pro). The block's
 * fixture array was removed — callers pass the real section directory.
 */
import type { ReactNode } from "react"

export interface ICard {
  title: string
  href: string
  description: string
  icon: ReactNode
  /** Tinted icon ground, token classes only, e.g. "bg-info/10 [&_svg]:text-info-foreground". */
  iconBg: string
  guides: { label: string; href: string }[]
}
