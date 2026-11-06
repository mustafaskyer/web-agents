import react from "@vitejs/plugin-react";
import { webAgentsChatDev } from "@web-agents/chat/vite";
import { defaultClientConditions, defineConfig } from "vite";

export default defineConfig({
  // /api/chat in dev; reads ANTHROPIC_API_KEY from .env.local on the server side only
  plugins: [react(), webAgentsChatDev()],
  // Resolve @web-agents/* to their TypeScript source, so package edits hot-reload without a build.
  resolve: { conditions: ["@web-agents/source", ...defaultClientConditions] },
});
