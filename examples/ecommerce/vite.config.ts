import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { webAgentsChatDev } from "@webmcp-agents/chat/vite";
import { defaultClientConditions, defineConfig } from "vite";
import { shopper } from "./src/webmcp-agents/agents.ts";
import { allowedTools } from "./src/webmcp-agents/tools/index.ts";

export default defineConfig({
  // /api/chat in dev; reads ANTHROPIC_API_KEY from .env.local on the server side only
  plugins: [react(), tailwindcss(), webAgentsChatDev({ agents: [shopper], tools: allowedTools })],
  // Resolve @webmcp-agents/* to their TypeScript source, so package edits hot-reload without a build.
  resolve: { conditions: ["@webmcp-agents/source", ...defaultClientConditions] },
  // The on-device model runs in a module worker: Vite must see the package's `new Worker(new URL(…))` unbundled
  optimizeDeps: { exclude: ["@webmcp-agents/local-agent", "@huggingface/transformers"] },
  worker: { format: "es" },
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
});
