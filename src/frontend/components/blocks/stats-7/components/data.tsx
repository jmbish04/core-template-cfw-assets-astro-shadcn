/**
 * @fileoverview Card shape for the stats-7 block (ReUI Pro). The block's
 * fixture array was removed — callers pass real values (see the landing page).
 */
import type { ReactNode } from "react"

import type { BadgeProps } from "@/components/reui/badge"

export interface CardData {
  title: string
  subtitle: string
  value: string
  badge: {
    color: BadgeProps["variant"]
    icon: ReactNode
    text: string
  }
  subtext: ReactNode
}
