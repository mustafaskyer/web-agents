import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "browser",
  dts: true,
  // Shipped as a separate file: consumers `import "@webmcp-agents/core/cursor.css"` (tsdown CSS bundling is experimental).
  copy: [{ from: "src/cursor.css", to: "dist" }],
  publint: true,
});
