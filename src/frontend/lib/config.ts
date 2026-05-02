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
  description: "A new project built with Astro, Tailwind CSS, and shadcn/ui.",
  url: "https://example.com",
  author: {
    name: "Author",
    url: "https://example.com",
  },
  links: {
    github: "https://github.com",
  },
  navItems: [
    // AI AGENT: Add your navigation items here
  ],
};
