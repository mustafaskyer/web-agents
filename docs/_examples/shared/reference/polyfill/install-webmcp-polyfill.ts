import { installWebMCPPolyfill } from "@webmcp-agents/core/polyfill";

// For a page that registers tools without createWebAgents or the
// provider (they load it themselves). Does nothing where the browser
// already has document.modelContext, and returns the native one.
const modelContext = installWebMCPPolyfill();

modelContext?.addEventListener("toolchange", async () => {
  const tools = await modelContext.getTools();
  console.log(tools.map((tool) => tool.name));
});
