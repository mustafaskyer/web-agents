import react from "@vitejs/plugin-react";
import { defaultClientConditions, defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Resolve @web-agents/* to their TypeScript source, so package edits hot-reload without a build.
  resolve: { conditions: ["@web-agents/source", ...defaultClientConditions] },
  server: { port: 5175, strictPort: true },
  preview: { port: 4175, strictPort: true },
});
