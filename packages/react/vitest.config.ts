import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ["@webmcp-agents/source", ...defaultClientConditions] },
  // The form tests bring their own libraries, the polyfill test renders on the server: a dependency discovered
  // mid-run reloads Vite and the test with it.
  optimizeDeps: { include: ["zod", "react-hook-form", "@hookform/resolvers/zod", "@tanstack/react-form", "react-dom/server.browser"] },
  test: {
    name: "react:browser",
    include: ["src/**/*.browser.test.tsx"],
    browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] },
  },
});
