import { defineConfig } from "@playwright/test";

const port = Number(process.env.PORT ?? 3002);

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "off",
    // Point at a pre-installed Chromium if Playwright's own browser isn't installed.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
  },
  webServer: {
    command: `pnpm next start --port ${port}`,
    port,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
