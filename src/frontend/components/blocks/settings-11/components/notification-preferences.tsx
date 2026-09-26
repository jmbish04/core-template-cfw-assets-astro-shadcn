import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import {
  CHANNELS,
  NOTIFICATION_TABS,
  type NotificationGroup,
  type NotificationItem,
} from "./data"

// ── Notification row ──

function NotificationTableRow({ item }: { item: NotificationItem }) {
  const checks = [item.email, item.slack, item.inApp]

  return (
    <TableRow>
      {/* Table */}
      <TableCell className="text-sm">{item.label}</TableCell>
      {checks.map((checked, i) => (
        <TableCell key={CHANNELS[i]}>
          <div className="flex justify-center">
            <Checkbox
              defaultChecked={checked}
              aria-label={`${item.label} via ${CHANNELS[i]}`}
            />
          </div>
        </TableCell>
      ))}
    </TableRow>
  )
}

// ── Section group ──

function NotificationSection({ group }: { group: NotificationGroup }) {
  return (
    <Table>
      {/* Header */}
      <TableHeader>
        <TableRow>
          <TableHead className="w-full font-semibold">{group.title}</TableHead>
          {CHANNELS.map((ch) => (
            <TableHead key={ch} className="text-muted-foreground text-xs">
              {ch}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      {/* Content */}
      <TableBody>
        {group.items.map((item) => (
          <NotificationTableRow key={item.id} item={item} />
        ))}
      </TableBody>
    </Table>
  )
}

// ── Main component ──

export function NotificationPreferences() {
  return (
    <div className="w-full max-w-3xl space-y-4">
      {/* Heading */}
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold">Notification Channels</h1>
        <p className="text-muted-foreground text-sm">
          Pick where each type of update lands so nothing important gets missed.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="projects">
        <TabsList variant="line" className="mb-3.5 p-0!">
          {NOTIFICATION_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {NOTIFICATION_TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-5">
            {tab.groups.map((group) => (
              <NotificationSection key={group.id} group={group} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}