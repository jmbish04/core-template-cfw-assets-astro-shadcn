import { Badge } from "@/components/reui/badge"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MODELS } from "./data"
import { ChevronDownIcon } from "lucide-react"

/** Static icon node: the shadcn CLI cannot resolve icon names from props. */
const ICON_CHEVRON = (
  <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
)

export function ModelMenu({
  modelId,
  onModelChange,
}: {
  modelId: string
  onModelChange: (id: string) => void
}) {
  const active = MODELS.find((model) => model.id === modelId) ?? MODELS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Model, ${active.name}`}
            className="text-foreground -ms-1.5 h-8 min-w-0 justify-start gap-1.5 px-1.5 font-medium"
          />
        }
      >
        <span className="min-w-0 truncate text-sm">{active.name}</span>
        {ICON_CHEVRON}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72 p-0">
        {/* Base UI throws on a label outside a group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground px-2.5 pt-2.5 pb-1 text-xs font-normal">
            Model
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuRadioGroup
          value={modelId}
          onValueChange={(value) => value && onModelChange(value)}
          className="px-1.5 pb-1.5"
        >
          {MODELS.map((model) => (
            <DropdownMenuRadioItem
              key={model.id}
              value={model.id}
              className="items-start gap-2 py-1.5"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm/5 font-medium">
                    {model.name}
                  </span>
                  {model.recommended ? (
                    <Badge variant="primary-light" className="shrink-0">
                      Default
                    </Badge>
                  ) : null}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {model.provider}
                  <span
                    aria-hidden="true"
                    className="bg-muted-foreground/40 mx-1.5 inline-block size-1 rounded-full align-middle"
                  />
                  <span className="tabular-nums">{model.context}</span> context
                  <span
                    aria-hidden="true"
                    className="bg-muted-foreground/40 mx-1.5 inline-block size-1 rounded-full align-middle"
                  />
                  {model.capability}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator className="my-0" />
        <p className="text-muted-foreground px-2.5 py-2 text-xs">
          Switching keeps this chat and its context.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}