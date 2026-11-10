import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  // Not "browser": that platform replaces `process.env.NODE_ENV` at library build time, and the provider's
  // development-only devtools import must keep it for the app's bundler to replace (and drop in production).
  platform: "neutral",
  dts: true,
  publint: true,
});
