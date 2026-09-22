import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  // GitHub Pages project site lives under /laya-case/. Local dev uses the same
  // base so every URL — assets, links, canonical — matches production exactly.
  base: "/laya-case/",
  output: "static",
  // Default to the production origin so local builds emit the same canonical
  // and Open Graph URLs as the deployed site without extra environment setup.
  site: process.env.PUBLIC_SITE_URL || "https://learningbydoingnow.github.io",
  integrations: [react()],
});
