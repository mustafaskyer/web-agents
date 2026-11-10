import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The re-exports load core from source, as the apps do in dev.
  ssr: { resolve: { conditions: ["@webmcp-agents/source", ...defaultServerConditions] } },
  test: { name: "polyfill:unit", include: ["src/**/*.test.ts"], environment: "node" },
});
