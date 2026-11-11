import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/react.tsx"],
  format: "esm",
  platform: "browser",
  dts: true,
  publint: true,
});
