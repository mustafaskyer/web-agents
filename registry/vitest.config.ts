import { defineConfig } from "vitest/config";

// The built registry JSON (apps/docs/public/r) against shadcn's schemas: run `pnpm registry:build` first.
export default defineConfig({ test: { name: "registry", include: ["test/**/*.test.ts"], environment: "node" } });
