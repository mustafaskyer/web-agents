import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["@webmcp-agents/source", ...defaultClientConditions] },
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
