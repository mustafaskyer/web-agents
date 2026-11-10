import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["@webmcp-agents/source", ...defaultClientConditions] },
  // Browser tests define tools with zod: a dependency discovered mid-run reloads Vite and the test with it.
  optimizeDeps: { include: ["zod"] },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "core:unit", include: ["src/**/*.test.ts"], exclude: ["src/**/*.browser.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "core:browser",
          include: ["src/**/*.browser.test.ts"],
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] },
        },
      },
    ],
  },
});
