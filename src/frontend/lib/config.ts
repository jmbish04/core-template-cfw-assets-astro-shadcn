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
  name: "New Project",
  description: "A Cloudflare Workers starter with Astro, shadcn/ui, session-based auth, and dynamic API documentation.",
  url: "https://example.com",
  author: {
    name: "Author",
    url: "https://example.com",
  },
  links: {
    github: "https://github.com",
  },
  navItems: [
    { href: "/openapi.json", label: "OpenAPI" },
    { href: "/swagger", label: "Swagger" },
    { href: "/scaler", label: "Scaler" },
  ],
};
