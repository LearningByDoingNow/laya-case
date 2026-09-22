import { defineConfig, devices } from "@playwright/test";

// Same base path as production (GitHub Pages project site) so tests exercise
// identical URLs locally and live. Override the origin to test the deployed
// site: TEST_ORIGIN=https://learningbydoingnow.github.io npm run test:smoke
const origin = process.env.TEST_ORIGIN ?? "http://127.0.0.1:4321";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: `${origin}/laya-case/`,
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        channel: "chrome",
      },
    },
  ],
});
