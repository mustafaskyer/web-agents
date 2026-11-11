import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ["@webmcp-agents/source", ...defaultClientConditions], dedupe: ["react", "react-dom"] },
  // Node-environment tests resolve like SSR: without the source condition here, `@webmcp-agents/core` resolves to its
  // dist, which core's own build rewrites while turbo runs these tests (CI: "Failed to resolve entry").
  ssr: { resolve: { conditions: ["@webmcp-agents/source", ...defaultServerConditions] } },
  // Pre-bundle React up front: discovering it mid-run reloads the optimizer and leaves two copies of React.
  optimizeDeps: { include: ["react", "react/jsx-dev-runtime", "react-dom", "react-dom/client", "vitest-browser-react"] },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "chat:node", include: ["test/**/*.test.ts"], exclude: ["test/**/*.browser.test.*"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "chat:browser",
          include: ["test/**/*.browser.test.{ts,tsx}"],
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] },
        },
      },
    ],
  },
});
