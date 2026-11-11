import { defineConfig } from "vitest/config";

// Pure logic only (flight generator, URL parsing). The UI is covered by Playwright in e2e/.
export default defineConfig({
  test: { name: "flights", include: ["src/**/*.test.ts"], environment: "node" },
});
