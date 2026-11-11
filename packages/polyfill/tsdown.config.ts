import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/auto.ts"],
  format: "esm",
  platform: "browser",
  dts: true,
  publint: true,
});
