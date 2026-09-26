import { useId } from "react"
import { Badge } from "@/components/reui/badge"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DUE_OPTIONS,
  OWNERS,
  TASK_ID,
  TASK_TITLE,
  type ArtifactRecord,
} from "./data"
import { WIDGET_LABEL } from "./widget-chrome"
import { LinkIcon, FileTextIcon } from "lucide-react"

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_LINK = (
  <LinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
)

const ICON_ARTIFACT = (
  <FileTextIcon className="size-3 shrink-0" aria-hidden="true" />
)

function ownerName(id: string) {
  return OWNERS.find((person) => person.id === id)?.name ?? OWNERS[0].name
}

function dueLabel(id: string) {
  return DUE_OPTIONS.find((option) => option.id === id)?.label ?? ""
}

export function HandoffCard({
  ownerId,
  dueId,
  created,
  artifacts,
  onOwnerChange,
  onDueChange,
  onCreate,
  onCopyLink,
}: {
  ownerId: string
  dueId: string
  /** Created, the form is replaced by the ticket it made. */
  created: boolean
  /** What the run produced. These are the files the ticket carries. */
  artifacts: ArtifactRecord[]
  onOwnerChange: (id: string) => void
  onDueChange: (id: string) => void
  onCreate: () => void
  onCopyLink: () => void
}) {
  const groupId = useId()
  const ownerFieldId = `${groupId}-owner`
  const dueFieldId = `${groupId}-due`
  const owner = OWNERS.find((person) => person.id === ownerId) ?? OWNERS[0]

  if (created) {
    return (
      <Card className="w-full overflow-hidden p-0 shadow-none">
        <Item size="sm">
          <ItemContent className="min-w-0 gap-1">
            <ItemTitle className="min-w-0 gap-2">
              <Badge variant="primary-light" radius="full" className="shrink-0">
                {TASK_ID}
              </Badge>
              <span className="min-w-0 truncate">{TASK_TITLE}</span>
            </ItemTitle>
            <ItemDescription className="flex min-w-0 items-center gap-1.5">
              <Avatar className="size-5 shrink-0">
                <AvatarImage src={owner.avatar} alt="" />
                <AvatarFallback className="text-xs">
                  {owner.initials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{owner.name}</span>
              <span
                aria-hidden="true"
                className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
              />
              <span className="shrink-0 tabular-nums">{dueLabel(dueId)}</span>
            </ItemDescription>
            {artifacts.length ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {artifacts.map((artifact) => (
                  <Badge
                    key={artifact.id}
                    variant="secondary"
                    radius="full"
                    className="max-w-full min-w-0 gap-1.5 font-normal"
                  >
                    {ICON_ARTIFACT}
                    <span className="truncate">{artifact.name}</span>
                  </Badge>
                ))}
              </div>
            ) : null}
          </ItemContent>
          <ItemActions>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Copy Link to ${TASK_ID}`}
              onClick={onCopyLink}
              className="text-muted-foreground hover:text-foreground h-7 gap-1.5 font-normal"
            >
              {ICON_LINK}
              Copy Link
            </Button>
          </ItemActions>
        </Item>
      </Card>
    )
  }

  return (
    <div
      role="group"
      aria-labelledby={groupId}
      className="@container flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h4 id={groupId} className={WIDGET_LABEL}>
          Hand Off
        </h4>
        {/* The thing being assigned, named: picking an owner for something you
            cannot see is the reason hand off forms get abandoned. */}
        <p className="text-sm font-medium">{TASK_TITLE}</p>
      </div>

      {/* The query lives on the wrapper, never on the grid itself: an element
          is not its own container, so the pair would size off an ancestor. */}
      <div className="grid gap-3 @[22rem]:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={ownerFieldId}>Owner</FieldLabel>
          <Select
            value={ownerId}
            onValueChange={(next) => next && onOwnerChange(next)}
          >
            <SelectTrigger id={ownerFieldId} className="w-full">
              <SelectValue>{(item: string) => ownerName(item)}</SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="min-w-(--anchor-width)"
            >
              <SelectGroup>
                {OWNERS.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar className="size-5 shrink-0">
                        <AvatarImage src={person.avatar} alt="" />
                        <AvatarFallback className="text-xs">
                          {person.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{person.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={dueFieldId}>Due</FieldLabel>
          <Select
            value={dueId}
            onValueChange={(next) => next && onDueChange(next)}
          >
            <SelectTrigger id={dueFieldId} className="w-full">
              <SelectValue>{(item: string) => dueLabel(item)}</SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="min-w-(--anchor-width)"
            >
              <SelectGroup>
                {DUE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="tabular-nums">{option.label}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* The payload, as objects rather than a promise in prose. */}
      {artifacts.length ? (
        <div
          role="group"
          aria-label="Files the ticket carries"
          className="flex flex-wrap items-center gap-1.5"
        >
          {artifacts.map((artifact) => (
            <Badge
              key={artifact.id}
              variant="secondary"
              radius="full"
              className="max-w-full min-w-0 gap-1.5 font-normal"
            >
              {ICON_ARTIFACT}
              <span className="truncate">{artifact.name}</span>
            </Badge>
          ))}
        </div>
      ) : null}

      <div>
        <Button type="button" size="sm" onClick={onCreate}>
          Create Task
        </Button>
      </div>
    </div>
  )
}