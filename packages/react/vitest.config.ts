import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

// A fresh object per project: Vitest expands `instances` in place.
const browser = () => ({ enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" as const }] });
/** The provider's devtools are development-only: these tests run as `vite dev` builds the page. */
const DEVELOPMENT = "src/provider.devtools.browser.test.tsx";

export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ["@webmcp-agents/source", ...defaultClientConditions], dedupe: ["react", "react-dom"] },
  // The form tests bring their own libraries, the polyfill test renders on the server, the provider loads the
  // devtools (React DOM's client and TanStack's event client): a dependency discovered mid-run reloads Vite and the
  // test with it.
  optimizeDeps: {
    include: [
      "zod",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "@tanstack/react-form",
      "react-dom/server.browser",
      "react-dom/client",
      "@webmcp-agents/devtools > @tanstack/devtools-event-client",
    ],
  },
  test: {
    projects: [
      // NODE_ENV "test": the provider installs no devtools, as in an app's own tests.
      {
        extends: true,
        test: { name: "react:browser", include: ["src/**/*.browser.test.tsx"], exclude: [DEVELOPMENT], browser: browser() },
      },
      {
        extends: true,
        define: { "process.env.NODE_ENV": JSON.stringify("development") },
        test: { name: "react:browser:development", include: [DEVELOPMENT], browser: browser() },
      },
    ],
  },
});
