import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ["@webmcp-agents/source", ...defaultClientConditions], dedupe: ["react", "react-dom"] },
  // Pre-bundle React up front: discovering it mid-run reloads the optimizer and leaves two copies of React.
  optimizeDeps: {
    include: ["react", "react/jsx-dev-runtime", "react-dom", "react-dom/client", "@tanstack/react-devtools", "vitest-browser-react"],
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "devtools:unit", include: ["src/**/*.test.ts"], exclude: ["src/**/*.browser.test.*"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "devtools:browser",
          include: ["src/**/*.browser.test.{ts,tsx}"],
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] },
        },
      },
    ],
  },
});
