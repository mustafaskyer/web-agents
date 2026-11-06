import { defineConfig } from "vitest/config";

// Lets `pnpm exec vitest` at the root (and editor integrations) see every package's tests.
// CI runs them per package through `turbo run test`.
export default defineConfig({ test: { projects: ["packages/*/vitest.config.ts"] } });
