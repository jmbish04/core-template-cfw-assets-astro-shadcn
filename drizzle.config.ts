import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schemas/index.ts",
  out: "./drizzle",
});
