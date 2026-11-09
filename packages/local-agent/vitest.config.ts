import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

// Pure logic only (parser, ranking, loop, worker protocol, Prompt API with stubs): no model is ever downloaded in tests.
export default defineConfig({
  resolve: { conditions: ["@webmcp-agents/source", ...defaultClientConditions] },
  test: { name: "local-agent", include: ["test/**/*.test.ts"], environment: "node" },
});
