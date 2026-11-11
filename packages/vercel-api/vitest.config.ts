import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

// Node-environment tests resolve like SSR: the source condition goes in ssr.resolve, or other workspace packages
// load from their (possibly stale) dist.
export default defineConfig({
  ssr: { resolve: { conditions: ["@webmcp-agents/source", ...defaultServerConditions] } },
  test: { name: "vercel-api", include: ["test/**/*.test.ts"], environment: "node" },
});
