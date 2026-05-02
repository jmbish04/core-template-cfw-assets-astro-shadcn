// @ts-check
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const site = process.env.SITE ?? "http://localhost:4321";
const base = process.env.BASE || "/";

// https://astro.build/config
export default defineConfig({
  site,
  srcDir: "./src/frontend",
  base,
  output: "server",
  adapter: cloudflare({
    imageService: "cloudflare",
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [react()],
  vite: {
    plugins: [
      // Cast to any to bypass Vite 6 / @tailwindcss/vite 7 HotUpdateOptions mismatch.
      // We use 'any' instead of 'import("vite").Plugin' because Vite is a transient
      // dependency via Astro, and strict pnpm resolution hides its types.
      tailwindcss() as any
    ],
  },
});
