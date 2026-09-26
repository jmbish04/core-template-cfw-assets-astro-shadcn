import { useEffect, useId, useMemo, useState } from "react"
import { CornerDownLeftIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { devLinks, navGroups } from "@/lib/config"

type Target = { href: string; label: string; section: string }

// ponytail: every page the shell knows about; add entity search (tasks, notes) when a /api/search exists.
const TARGETS: Target[] = [
  ...navGroups.flatMap((g) =>
    g.items.flatMap((item) => [
      { href: item.href, label: item.label, section: g.label },
      ...(item.children ?? [])
        .filter((c) => c.href !== item.href)
        .map((c) => ({ href: c.href, label: `${item.label} › ${c.label}`, section: g.label })),
    ]),
  ),
  ...devLinks.map((d) => ({ href: d.href, label: d.label, section: "API & docs" })),
]

export function SearchMenu() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [cursor, setCursor] = useState(0)
  const inputId = useId()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? TARGETS.filter((t) => `${t.label} ${t.section} ${t.href}`.toLowerCase().includes(q)) : TARGETS
  }, [query])

  const go = (t?: Target) => t && (window.location.href = t.href)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Search pages (⌘K)"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-4.5 transition-colors" aria-hidden="true" />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) {
            setQuery("")
            setCursor(0)
          }
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0 **:data-[slot=dialog-close]:top-3 **:data-[slot=dialog-close]:right-3">
          <DialogHeader className="sr-only">
            <DialogTitle>Go to page</DialogTitle>
            <DialogDescription>Search every page in the app.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 border-b px-4">
            <SearchIcon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
            <Input
              id={inputId}
              className="h-11 border-none bg-transparent! p-0 shadow-none focus-visible:ring-0"
              autoFocus
              placeholder="Go to page…"
              aria-label="Search pages"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setCursor(0)
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setCursor((c) => Math.min(c + 1, results.length - 1))
                } else if (e.key === "ArrowUp") {
                  e.preventDefault()
                  setCursor((c) => Math.max(c - 1, 0))
                } else if (e.key === "Enter") {
                  e.preventDefault()
                  go(results[cursor])
                }
              }}
            />
          </div>
          <ul role="listbox" aria-label="Pages" className="max-h-80 overflow-y-auto p-1">
            {results.length === 0 && <li className="text-muted-foreground px-3 py-6 text-center text-sm">No page matches “{query}”.</li>}
            {results.map((t, i) => (
              <li key={t.href + t.label} role="option" aria-selected={i === cursor}>
                <a
                  href={t.href}
                  onMouseEnter={() => setCursor(i)}
                  className="aria-selected:bg-accent flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm outline-none data-[on=true]:bg-accent"
                  data-on={i === cursor}
                >
                  <span className="truncate">{t.label}</span>
                  <span className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                    {t.section}
                    {i === cursor && <CornerDownLeftIcon className="size-3.5" aria-hidden="true" />}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="text-muted-foreground flex items-center gap-3 border-t px-4 py-2 text-xs">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
            <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
            <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
