/**
 * @fileoverview MarkdownText — renders an assistant text message part as
 * GitHub-flavoured Markdown styled for the dark Monolith theme.
 *
 * WHY a bespoke renderer (and not `@assistant-ui/react-markdown`):
 * the latest `@assistant-ui/react-markdown` peer-requires `@assistant-ui/react`
 * `^0.14.18`, which is incompatible with the pinned `0.12.28` ↔
 * `@cloudflare/ai-chat@0.7.1` bridge. So we render with plain `react-markdown`
 * (9.x, React-19 safe) + `remark-gfm` (4.x) and route fenced code blocks through
 * the project's existing Shiki-powered {@link CodeBlock}.
 *
 * The component is memoized on the raw markdown string: assistant text parts
 * re-render on every stream delta, so memoizing keeps `react-markdown`'s parse
 * off the hot path unless the text actually changed.
 *
 * SSR: this file is only ever imported by `client:only="react"` islands. It does
 * not touch `window` directly, but `CodeBlock` highlights inside a browser
 * effect, so it must never be hydrated server-side.
 */

"use client";

import { memo, type ComponentPropsWithoutRef, type ReactNode } from "react";

import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";

/** Extract the plain-text content of a React node tree (for code blocks). */
function nodeToString(node: ReactNode): string {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToString).join("");
  if (typeof node === "object" && "props" in node) {
    return nodeToString((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

/** Pull a `language-xxx` className (emitted by remark for fenced blocks). */
function languageFromClassName(className?: string): string | undefined {
  if (!className) return undefined;
  const match = /language-([\w-]+)/.exec(className);
  return match?.[1];
}

/**
 * `react-markdown` component overrides mapping every element to a
 * Monolith-styled equivalent. Code is special-cased: fenced blocks (which
 * `react-markdown` wraps in `<pre><code class="language-x">`) render through
 * {@link CodeBlock}; inline code renders as a styled `<code>` chip.
 */
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-lg font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-base font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-sm font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-2 leading-relaxed text-foreground/90 first:mt-0 last:mb-0">{children}</p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-2 ml-4 list-disc space-y-1 text-foreground/90 marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 text-foreground/90 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 rounded-r-md bg-muted/30 py-1 pl-3 text-foreground/80 italic ring-1 ring-border/30 ring-l-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-0 bg-border/40 h-px" />,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg bg-card ring-1 ring-border/40">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/40 text-muted-foreground">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 align-top text-foreground/90">{children}</td>,
  tr: ({ children }) => <tr className="divide-x divide-border/20 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/20">{children}</tr>,
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children, ...rest }: ComponentPropsWithoutRef<"code">) => {
    const language = languageFromClassName(className);
    const text = nodeToString(children);
    // A fenced block always carries a `language-*` className from remark OR
    // spans multiple lines — either way we route it to the Shiki CodeBlock.
    const isBlock = Boolean(language) || text.includes("\n");

    if (isBlock) {
      return (
        <div className="my-3">
          <CodeBlock code={text.replace(/\n$/, "")} language={language ?? "text"} />
        </div>
      );
    }

    return (
      <code
        className={cn(
          "rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-primary ring-1 ring-border/30",
          className,
        )}
        {...rest}
      >
        {children}
      </code>
    );
  },
};

/** Props for {@link MarkdownText}. */
export interface MarkdownTextProps {
  /** The raw markdown source for one assistant text part. */
  text: string;
}

/**
 * Render an assistant text part as styled GFM markdown.
 *
 * Designed to be dropped straight into `MessagePrimitive.Parts`'s `Text`
 * component slot.
 */
export const MarkdownText = memo(function MarkdownText({ text }: MarkdownTextProps) {
  return (
    <div className="text-sm break-words">
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {text}
      </Markdown>
    </div>
  );
});
