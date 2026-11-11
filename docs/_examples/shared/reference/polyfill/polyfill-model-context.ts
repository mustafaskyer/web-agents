import { installWebMCPPolyfill } from "@webmcp-agents/core/polyfill";

const modelContext = installWebMCPPolyfill();

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

// Run it the way an agent would, and cancel it if it takes too long.
const controller = new AbortController();
setTimeout(() => controller.abort(), 5_000);

const result = await modelContext?.executeTool(
  "say_hello",
  { name: "Ana" },
  { signal: controller.signal },
);
console.log(result);
