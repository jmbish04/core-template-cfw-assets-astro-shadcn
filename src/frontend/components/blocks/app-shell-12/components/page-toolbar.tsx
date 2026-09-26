import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Page title row from app-shell-12's toolbar. Render it WITHOUT a client
 * directive from .astro pages (static HTML); put interactive actions in their
 * own island and pass them as children.
 */
export function PageToolbar({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="text-foreground text-xl leading-6 font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground max-w-3xl text-sm">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

/** Standard page body inside the shell: block spacing from app-shell-12. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("flex min-w-0 flex-1 flex-col gap-5 px-4 py-4 md:px-6 md:py-5", className)}>{children}</main>
}
