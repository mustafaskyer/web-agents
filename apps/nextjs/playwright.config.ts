import { defineConfig, devices } from "@playwright/test";

const PORT = 5176;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // reduced motion: the agent cursor snaps instead of travelling, so runs are fast and deterministic
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry", reducedMotion: "reduce" },
  // `next dev`: the devtools (and window.agent) are dev-only
  webServer: { command: "pnpm dev", url: `http://localhost:${PORT}`, reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
