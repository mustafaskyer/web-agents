/**
 * Screenshots and clips for the docs (`pnpm capture`), not tests: every example app runs, stills are taken under
 * reduced motion (the cursor snaps, frames are deterministic), clips with motion on and video recording.
 * Output lands in capture/out/ (gitignored); capture/encode.mjs turns it into docs/media/**.
 */
import { defineConfig, devices } from "@playwright/test";

const app = (name: string, port: number) => ({
  command: `pnpm --filter ${name} dev`,
  url: `http://localhost:${port}`,
  reuseExistingServer: true,
  timeout: 240_000,
});

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.capture\.ts/,
  outputDir: "out/pw",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: { trace: "off", screenshot: "off" },
  webServer: [
    app("@webmcp-agents/example-playground", 5173),
    app("@webmcp-agents/example-ecommerce", 5174),
    app("@webmcp-agents/example-flights", 5175),
    app("@webmcp-agents/example-nextjs", 5176),
  ],
  projects: [
    {
      name: "stills",
      testIgnore: /clips\.capture\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, reducedMotion: "reduce" },
    },
    {
      name: "mobile",
      testMatch: /examples\.capture\.ts/,
      use: { ...devices["Pixel 7"], reducedMotion: "reduce" },
    },
    {
      name: "clips",
      testMatch: /clips\.capture\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        reducedMotion: "no-preference",
        video: { mode: "on", size: { width: 1280, height: 800 } },
      },
    },
  ],
});
