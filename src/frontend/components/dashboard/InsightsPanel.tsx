/**
 * @fileoverview AI Insights panel — the headline feature of the dashboard.
 *
 * Calls `GET /api/dashboard/insights` (Workers AI) and renders the returned
 * markdown-ish bullet string. The backend guarantees a "- " prefixed bullet
 * list, so we parse leading "- " / "* " markers into a styled list and fall
 * back to paragraph rendering for any other shape. A lightweight inline parser
 * also honours `**bold**` and `` `code` `` spans — enough for the analyst
 * output without pulling in a markdown dependency.
 *
 * Surface: a ReUI `Frame` (stacked header + panel) with a "Workers AI" badge,
 * a regenerate button, the generated-at relative time and a "thinking"
 * skeleton. The Workers AI endpoint is optional and may change or fail, so a
 * failure renders a calm "unavailable" note with a retry — never a red alarm —
 * and never blocks the rest of the dashboard.
 */

"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { Fragment } from "react";

import { Badge } from "@/components/reui/badge";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { relativeTime } from "@/lib/format";

import type { DashboardInsights } from "./types";
import type { Resource } from "./useDashboardData";

/**
 * Split the insight string into discrete bullet lines. Lines beginning with
 * `-` or `*` (optionally indented) are treated as bullets; everything else is
 * kept as a paragraph line.
 */
function parseLines(insight: string): { bullet: boolean; text: string }[] {
  return insight
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^[-*]\s+(.*)$/.exec(l);
      return m ? { bullet: true, text: m[1] } : { bullet: false, text: l };
    });
}

/**
 * Render inline `**bold**` and `` `code` `` spans inside a single line without
 * a markdown library. Returns an array of React nodes.
 */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function InsightsPanel({
  resource,
}: {
  resource: Resource<DashboardInsights>;
}) {
  const { data, loading, error, reload } = resource;
  const lines = data ? parseLines(data.insight) : [];
  const bullets = lines.filter((l) => l.bullet);
  const paragraphs = lines.filter((l) => !l.bullet);

  return (
    <Frame stacked className="min-h-full w-full">
      <FrameHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-info/10 text-info-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <FrameTitle>AI insights</FrameTitle>
            <FrameDescription className="text-xs">
              Trends, risks and recommendations from your live data.
            </FrameDescription>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="info-light" className="hidden sm:inline-flex">
            Workers AI
          </Badge>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={reload}
            disabled={loading}
            aria-label="Regenerate insights"
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden />
          </Button>
        </div>
      </FrameHeader>

      <FramePanel className="flex flex-col gap-4">
        {error ? (
          <div role="status" className="bg-muted/40 flex flex-col items-start gap-2 rounded-lg p-4">
            <p className="text-foreground text-sm font-medium">Insights are unavailable right now.</p>
            <p className="text-muted-foreground text-sm">
              The AI summary could not be generated ({error}). The rest of the dashboard is unaffected — try again in a moment.
            </p>
            <Button size="sm" variant="outline" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : null}

        {loading && !data && !error ? (
          <div className="flex flex-col gap-3" aria-busy>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Sparkles className="size-4 animate-pulse" aria-hidden />
              Thinking…
            </div>
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[78%]" />
            <Skeleton className="h-4 w-[85%]" />
          </div>
        ) : null}

        {data && !error ? (
          <>
            {bullets.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="bg-info mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
                    <span className="text-foreground/90 text-sm leading-relaxed">{renderInline(b.text)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {paragraphs.length > 0 ? (
              <div className="flex flex-col gap-2">
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-foreground/90 text-sm leading-relaxed">
                    {renderInline(p.text)}
                  </p>
                ))}
              </div>
            ) : null}

            <p className="text-muted-foreground text-xs">Updated {relativeTime(data.generatedAt)}</p>
          </>
        ) : null}
      </FramePanel>
    </Frame>
  );
}
