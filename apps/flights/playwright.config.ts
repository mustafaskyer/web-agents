import { defineConfig, devices } from "@playwright/test";

const PORT = 5175;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // reduced motion: the agent cursor snaps instead of travelling, so runs are fast and deterministic
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry", reducedMotion: "reduce" },
  webServer: { command: "pnpm dev", url: `http://localhost:${PORT}`, reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
