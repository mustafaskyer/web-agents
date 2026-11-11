import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["@webmcp-agents/source", ...defaultClientConditions] },
  // node tests import core at runtime: its source, not a stale dist
  ssr: { resolve: { conditions: ["@webmcp-agents/source", ...defaultServerConditions] } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "tools:node", include: ["src/**/*.test.ts"], exclude: ["src/**/*.browser.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "tools:browser",
          include: ["src/**/*.browser.test.ts"],
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] },
        },
      },
    ],
  },
});
