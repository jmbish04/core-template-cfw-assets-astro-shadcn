/**
 * @fileoverview TemplateLandingPage — the `/` overview island.
 *
 * Composed from two ReUI Pro blocks, adapted by reuse:
 *  - stats-7 (`blocks/stats-7`): three divided metric cells, fed live from
 *    `GET /api/dashboard/stats`.
 *  - card-20 (`blocks/card-20`): framed link cards, one per app area, each with
 *    a list of deep links. This is the directory of everything in the app,
 *    including the dynamic API docs pointers (/openapi.json, /swagger, /scalar).
 * Plus a template follow-up panel carrying the copyable replacement prompt.
 * Errors go through the centralized frontend error handler (no alerts).
 */
import {
  BookOpenIcon,
  CheckCircle2Icon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  MessagesSquareIcon,
  NotebookPenIcon,
  SettingsIcon,
  TriangleAlertIcon,
} from "lucide-react";
import * as React from "react";

import { CardGrid } from "@/components/blocks/card-20/components/card-grid";
import type { ICard } from "@/components/blocks/card-20/components/data";
import type { CardData } from "@/components/blocks/stats-7/components/data";
import { Stats } from "@/components/blocks/stats-7/components/stats";
import { CopyButton } from "@/components/CopyButton";
import { FrontendErrorDialog } from "@/components/FrontendErrorDialog";
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame";
import { apiGet } from "@/lib/api";
import { useFrontendErrorHandler } from "@/lib/error-handler";
import { compactNumber } from "@/lib/format";
import { TEMPLATE_FRONTEND_REPLACEMENT_PROMPT } from "@/lib/template-prompts";

type DashboardStats = {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  completionRatePct: number;
  overdueTasks: number;
  unreadNotifications: number;
};

const PAGE_FILE = "src/frontend/components/TemplateLandingPage.tsx";

/** Every area of the app, grouped the way the sidebar groups them. */
const SECTIONS: ICard[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    description: "KPIs, charts and Workers AI insights over your live D1 data.",
    icon: <LayoutDashboardIcon aria-hidden="true" />,
    iconBg: "bg-info/10 [&_svg]:text-info-foreground",
    guides: [
      { label: "Admin dashboard", href: "/dashboard" },
      { label: "Analytics", href: "/analytics" },
    ],
  },
  {
    title: "Projects and tasks",
    href: "/projects",
    description: "Project list, task table with facet filters, and a kanban board.",
    icon: <FolderKanbanIcon aria-hidden="true" />,
    iconBg: "bg-success/10 [&_svg]:text-success-foreground",
    guides: [
      { label: "Projects", href: "/projects" },
      { label: "All tasks", href: "/tasks" },
      { label: "Task board", href: "/tasks/board" },
    ],
  },
  {
    title: "Notes and inbox",
    href: "/notes",
    description: "Rich-text team notes and an inbox fed by Cloudflare Email Routing.",
    icon: <NotebookPenIcon aria-hidden="true" />,
    iconBg: "bg-warning/10 [&_svg]:text-warning-foreground",
    guides: [
      { label: "Notes", href: "/notes" },
      { label: "Inbox", href: "/inbox" },
    ],
  },
  {
    title: "AI chat",
    href: "/chat",
    description: "Chat with the assistant about your projects, tasks and notes.",
    icon: <MessagesSquareIcon aria-hidden="true" />,
    iconBg: "bg-primary/10 [&_svg]:text-primary",
    guides: [{ label: "Open AI chat", href: "/chat" }],
  },
  {
    title: "Settings",
    href: "/settings",
    description: "Preferences, notification rules, webhooks and the activity log.",
    icon: <SettingsIcon aria-hidden="true" />,
    iconBg: "bg-muted [&_svg]:text-muted-foreground",
    guides: [
      { label: "Notifications feed", href: "/notifications" },
      { label: "Preferences", href: "/settings/preferences" },
      { label: "Webhooks", href: "/settings/webhooks" },
      { label: "Activity", href: "/settings/activity" },
    ],
  },
  {
    title: "Docs and API",
    href: "/docs",
    description: "Architecture docs, the developer playbook and the live OpenAPI reference.",
    icon: <BookOpenIcon aria-hidden="true" />,
    iconBg: "bg-muted [&_svg]:text-muted-foreground",
    guides: [
      { label: "Docs", href: "/docs" },
      { label: "Playbook", href: "/playbook" },
      { label: "openapi.json", href: "/openapi.json" },
      { label: "Swagger", href: "/swagger" },
      { label: "Scalar", href: "/scalar" },
    ],
  },
];

const DASH = "—";

/** Map the stats payload (or null while loading) onto the stats-7 cells. */
function toCards(s: DashboardStats | null): CardData[] {
  const n = (v: number | undefined) => (v === undefined ? DASH : compactNumber(v));
  return [
    {
      title: "Projects",
      subtitle: "All time",
      value: n(s?.totalProjects),
      badge: { color: "info-light", icon: <FolderKanbanIcon aria-hidden="true" />, text: `${n(s?.activeProjects)} active` },
      subtext: (
        <a href="/projects" className="text-muted-foreground hover:text-primary text-sm">
          Open projects
        </a>
      ),
    },
    {
      title: "Tasks completed",
      subtitle: "All time",
      value: s ? `${s.completionRatePct}%` : DASH,
      badge: {
        color: "success-light",
        icon: <CheckCircle2Icon aria-hidden="true" />,
        text: `${n(s?.completedTasks)} of ${n(s?.totalTasks)}`,
      },
      subtext: (
        <a href="/tasks" className="text-muted-foreground hover:text-primary text-sm">
          Open tasks
        </a>
      ),
    },
    {
      title: "Overdue tasks",
      subtitle: "Past due, not done",
      value: n(s?.overdueTasks),
      badge: {
        color: s && s.overdueTasks > 0 ? "destructive-light" : "success-light",
        icon: <TriangleAlertIcon aria-hidden="true" />,
        text: s && s.overdueTasks > 0 ? "Needs attention" : "On track",
      },
      subtext: (
        <a href="/notifications" className="text-muted-foreground hover:text-primary text-sm">
          {n(s?.unreadNotifications)} unread notifications
        </a>
      ),
    },
  ];
}

export function TemplateLandingPage() {
  const { activeError, clearError, copyErrorPrompt, copyState, handleError } =
    useFrontendErrorHandler();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);

  const report = React.useCallback(
    (functionName: string, description: string, friendlyError: string, serverError: unknown) =>
      handleError({
        sourcePage: { url: window.location.href, file: "src/frontend/pages/index.astro" },
        codeSource: { file: PAGE_FILE, functionName, description },
        errorDetails: { friendlyError, serverError },
      }),
    [handleError],
  );

  React.useEffect(() => {
    apiGet<DashboardStats>("dashboard/stats")
      .then(setStats)
      .catch((error) =>
        report(
          "loadStats",
          "Loads the overview metrics from GET /api/dashboard/stats.",
          "The overview metrics could not be loaded. Reload the page; if it keeps failing, check the Worker logs for /api/dashboard/stats.",
          error,
        ),
      );
  }, [report]);

  const isEmpty = stats !== null && stats.totalProjects === 0 && stats.totalTasks === 0;

  return (
    <>
      <Stats cards={toCards(stats)} />

      {isEmpty && (
        <p className="text-muted-foreground text-sm">
          No data yet. Open the{" "}
          <a href="/dashboard" className="text-primary hover:underline">
            dashboard
          </a>{" "}
          and choose Seed demo data to fill every page.
        </p>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="sections-heading">
        <h2 id="sections-heading" className="text-foreground text-base font-semibold">
          Everything in this app
        </h2>
        <CardGrid cards={SECTIONS} />
      </section>

      <Frame>
        <FrameHeader>
          <FrameTitle>Starting a new project from this template?</FrameTitle>
          <FrameDescription>
            Give this instruction to your coding agent. It replaces the reference pages and keeps
            the shared shell and the /openapi.json, /swagger and /scalar docs pointers.
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          <pre className="text-foreground overflow-auto text-xs leading-5 whitespace-pre-wrap">
            {TEMPLATE_FRONTEND_REPLACEMENT_PROMPT}
          </pre>
        </FramePanel>
        <FrameFooter className="flex-row">
          <CopyButton
            text={TEMPLATE_FRONTEND_REPLACEMENT_PROMPT}
            label="Copy agent instruction"
            copiedLabel="Instruction copied"
            onCopyError={(error) =>
              report(
                "handleCopyError",
                "Copies the template replacement prompt to the clipboard.",
                "The instruction could not be copied. Select the text above and copy it manually.",
                error,
              )
            }
          />
        </FrameFooter>
      </Frame>

      <FrontendErrorDialog
        error={activeError}
        copyState={copyState}
        onCopyPrompt={copyErrorPrompt}
        onOpenChange={(open) => {
          if (!open) clearError();
        }}
      />
    </>
  );
}
