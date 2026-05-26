export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  author: {
    name: string;
    url: string;
  };
  links: {
    github: string;
  };
  navItems: {
    href: string;
    label: string;
    external?: boolean;
  }[];
};

export const siteConfig: SiteConfig = {
  name: "Cloudflare Edge Showcase",
  description:
    "Multi-page edge frontend showcase using Astro, React, Shadcn UI, and assistant-ui with Cloudflare Agents SDK",
  url: "https://example.com",
  author: {
    name: "Author",
    url: "https://example.com",
  },
  links: {
    github: "https://github.com",
  },
  navItems: [
    { href: "/", label: "Overview" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/playbook", label: "Playbook" },
    { href: "/showcase/code-mode", label: "Code Mode" },
    { href: "/showcase/browser-hitl", label: "Browser HITL" },
    { href: "/showcase/multi-agent", label: "Multi-Agent" },
    { href: "/showcase/workflows", label: "Workflows" },
    { href: "/showcase/artifacts", label: "Artifacts" },
    { href: "/openapi.json", label: "OpenAPI" },
    { href: "/swagger", label: "Swagger" },
    { href: "/scaler", label: "Scaler" },
  ],
};
