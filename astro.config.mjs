import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  // GitHub Pages project site lives under /laya-case/. Local dev uses the same
  // base so every URL — assets, links, canonical — matches production exactly.
  base: "/laya-case/",
  output: "static",
  site: process.env.PUBLIC_SITE_URL,
  integrations: [react()],
});
