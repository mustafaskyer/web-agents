import { defineConfig } from "tsdown";

export default defineConfig({
  // One build for the browser entry and the server/vite entries: everything platform-specific is external.
  entry: { index: "src/index.ts", server: "src/server/index.ts", vite: "src/vite/index.ts" },
  format: "esm",
  platform: "neutral",
  dts: true,
  deps: { neverBundle: [/^node:/] },
  // Shipped as a separate file: consumers `import "@web-agents/chat/chat.css"` (like core's cursor.css).
  copy: [{ from: "src/chat.css", to: "dist" }],
  publint: true,
});
