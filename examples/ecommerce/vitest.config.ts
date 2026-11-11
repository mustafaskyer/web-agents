import { defineConfig } from "vitest/config";

// Pure logic only (catalogue queries, cart rules). The UI is covered by Playwright in e2e/.
export default defineConfig({
  test: { name: "ecommerce", include: ["src/**/*.test.ts"], environment: "node" },
});
