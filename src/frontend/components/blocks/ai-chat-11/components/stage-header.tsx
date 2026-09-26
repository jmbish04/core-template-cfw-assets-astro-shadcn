import { Badge } from "@/components/reui/badge"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { THREADS, type Density } from "./data"
import { ChevronDownIcon, PlusIcon, StarIcon, Settings2Icon, Trash2Icon } from "lucide-react"

/** Recency groups render in this order, whatever order THREADS arrives in. */
const GROUP_ORDER = ["Today", "Earlier"]

export function StageHeader({
  threadId,
  onThreadChange,
  onNewThread,
  favorite,
  onFavoriteToggle,
  streaming,
  density,
  onDensityChange,
  showRunDetails,
  onRunDetailsToggle,
  showTimestamps,
  onTimestampsToggle,
  onClear,
}: {
  threadId: string
  onThreadChange: (id: string) => void
  onNewThread: () => void
  favorite: boolean
  onFavoriteToggle: () => void
  streaming: boolean
  density: Density
  onDensityChange: (next: Density) => void
  showRunDetails: boolean
  onRunDetailsToggle: () => void
  showTimestamps: boolean
  onTimestampsToggle: () => void
  onClear: () => void
}) {
  const thread = THREADS.find((entry) => entry.id === threadId)

  return (
    // Borderless: a translucent blur plus an ::after gradient below it, so the
    // transcript dissolves under the bar instead of stopping at a rule.
    <header className="bg-background/70 supports-backdrop-filter:bg-background/60 after:from-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-4 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-6 after:bg-gradient-to-b after:to-transparent sm:px-6">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              // Button ships shrink-0, so the title cannot truncate and
              // pushes the toolbar off-screen on a narrow shell without this.
              className="-ms-2 min-w-0 shrink gap-1.5 px-2"
            />
          }
        >
          <span className="min-w-0 truncate font-medium">
            {thread ? thread.title : "New thread"}
          </span>
          <ChevronDownIcon className="shrink-0 opacity-60" data-icon="inline-end" aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuItem onClick={onNewThread}>
            <PlusIcon className="size-4" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">New chat</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuRadioGroup
            value={threadId}
            onValueChange={(next) => next && onThreadChange(next)}
          >
            {GROUP_ORDER.map((group) => {
              const rows = THREADS.filter((entry) => entry.group === group)
              if (rows.length === 0) return null
              return (
                <DropdownMenuGroup key={group}>
                  <DropdownMenuLabel>{group}</DropdownMenuLabel>
                  {rows.map((entry) => (
                    <DropdownMenuRadioItem
                      key={entry.id}
                      value={entry.id}
                      closeOnClick
                      className="gap-2"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          entry.live ? "bg-success" : "bg-muted-foreground/40"
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {entry.title}
                        {entry.live ? (
                          <span className="sr-only">, run in progress</span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {entry.at}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuGroup>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Run state: the only thing in the bar that changes on its own. */}
      {streaming ? (
        <Badge variant="primary-light" size="sm" className="shrink-0">
          Working
        </Badge>
      ) : null}

      <div className="ms-auto flex shrink-0 items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Favorite thread"
                aria-pressed={favorite}
                onClick={onFavoriteToggle}
              />
            }
          >
            <StarIcon className={cn("size-4", favorite && "text-warning fill-current")} aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>
            {favorite ? "Unfavorite" : "Favorite"}
          </TooltipContent>
        </Tooltip>

        {/* Every row here changes what the transcript renders. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Conversation settings"
              />
            }
          >
            <Settings2Icon className="size-4" aria-hidden="true" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Transcript</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuCheckboxItem
              checked={showRunDetails}
              onCheckedChange={onRunDetailsToggle}
              closeOnClick={false}
            >
              Run details
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showTimestamps}
              onCheckedChange={onTimestampsToggle}
              closeOnClick={false}
            >
              Timestamps
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel>Density</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuRadioGroup
              value={density}
              onValueChange={(next) => next && onDensityChange(next as Density)}
            >
              <DropdownMenuRadioItem value="comfortable" closeOnClick>
                Comfortable
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="compact" closeOnClick>
                Compact
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onClick={onClear}>
              <Trash2Icon className="size-4" aria-hidden="true" />
              Clear conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}