import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["@web-agents/source", ...defaultClientConditions] },
  test: {
    name: "polyfill:browser",
    include: ["src/**/*.browser.test.ts"],
    browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] },
  },
});
