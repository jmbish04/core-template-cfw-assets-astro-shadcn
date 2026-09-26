"use client"

import { useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { APPS, type AppId, type AppRecord } from "./data"
import { XIcon, PlusIcon } from "lucide-react"

/**
 * Sizes the scope without naming the apps. The marks beside it already say
 * which ones, and a second roster in prose only competes with them.
 */
function scopeLine(count: number) {
  if (count === 0) return "No apps connected yet"
  if (count === APPS.length) return `Reading all ${APPS.length} apps`
  return `Reading ${count} of ${APPS.length} apps`
}

/**
 * What the assistant may read, settled in one row: connected apps stand as
 * bare marks, and the picker finds another by name out of the full list.
 */
export function Integrations({
  connected,
  onToggle,
}: {
  connected: AppId[]
  onToggle: (id: AppId, next: boolean) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const selected = APPS.filter((app) => connected.includes(app.id))

  function disconnect(id: AppId) {
    onToggle(id, false)
    // The pressed control unmounts, so focus would fall to <body> and a
    // keyboard pass would restart at the top of the page.
    window.setTimeout(
      () => rowRef.current?.querySelector<HTMLButtonElement>("button")?.focus(),
      0
    )
  }

  /**
   * The picker hands back the whole selection at once. Only the app that
   * actually changed is reported, so the parent keeps taking one id at a time.
   */
  function handleSelection(next: AppRecord[]) {
    const nextIds = next.map((app) => app.id)
    for (const app of APPS) {
      const on = nextIds.includes(app.id)
      if (connected.includes(app.id) !== on) onToggle(app.id, on)
    }
  }

  return (
    <div
      ref={rowRef}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <p className="text-muted-foreground min-w-0 truncate text-xs">
        {scopeLine(selected.length)}
      </p>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {/* Rendered only while there is something to show: an empty scope says
            so in the line above rather than leaving a hollow strip. */}
        {selected.length ? (
          <ul
            aria-label="Connected apps"
            className="flex flex-wrap items-center gap-0.5"
          >
            {selected.map((app) => {
              const Logo = app.logo
              return (
                <li
                  key={app.id}
                  className="group/app relative flex size-7 items-center justify-center"
                >
                  <Logo className="h-4 w-auto" aria-hidden="true" />
                  {/* Mounted and pressable at rest, only its paint waits, so
                      touch and keyboard never depend on a hover that cannot fire. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Disconnect ${app.name}`}
                    onClick={() => disconnect(app.id)}
                    className="ring-background absolute -end-0.5 -top-0.5 size-4 rounded-full opacity-0 shadow-sm ring-2 transition-opacity group-hover/app:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
                  >
                    <XIcon className="size-2.5" aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : null}

        <Combobox
          multiple
          items={APPS}
          value={selected}
          onValueChange={(next) => handleSelection(next as AppRecord[])}
          // An app record carries neither `label` nor `value`, so without this
          // the filter would match a serialized object and never find a name.
          itemToStringLabel={(app: AppRecord) => app.name}
          autoHighlight
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <ComboboxTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Add an app"
                      // The trigger appends its own chevron and offers no prop
                      // to drop it; a plus alone is the whole affordance here.
                      className="rounded-full [&>svg:last-child]:hidden"
                    />
                  }
                />
              }
            >
              <PlusIcon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Add an app</TooltipContent>
          </Tooltip>

          {/* The trigger is only as wide as its label, so the popup sets its
              own width and hangs off the end instead of inheriting one. */}
          <ComboboxContent align="end" className="w-72">
            <ComboboxInput showTrigger={false} placeholder="Search apps" />
            <ComboboxEmpty>No apps found.</ComboboxEmpty>
            <ComboboxList>
              {(app: AppRecord) => {
                const Logo = app.logo
                return (
                  <ComboboxItem
                    key={app.id}
                    value={app}
                    className="items-center gap-2.5 py-1.5"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center">
                      <Logo className="h-4 w-auto" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm/5 font-medium">
                        {app.name}
                      </span>
                      {/* Says what connecting grants before it is granted. */}
                      <span className="text-muted-foreground truncate text-[11px]/4">
                        {app.scope}
                      </span>
                    </span>
                  </ComboboxItem>
                )
              }}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    </div>
  )
}