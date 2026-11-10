import { loadWebMCPPolyfill } from "@webmcp-agents/core";

// A page that registers a tool by hand, without createWebAgents:
// give it document.modelContext first, in any browser.
const modelContext = await loadWebMCPPolyfill();

modelContext?.registerTool({
  name: "say_hello",
  description: "Greet someone by name.",
  inputSchema: {
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
  },
  execute: async ({ name }: { name: string }) => `Hello, ${name}!`,
});
