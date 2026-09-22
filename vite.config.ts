import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Keep in sync with astro.config base (GitHub Pages project site).
  base: "/laya-case/",
  plugins: [react()],
});
