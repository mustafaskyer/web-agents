import type { AgentAdapter } from "@webmcp-agents/chat";
import {
  createTransformersProvider,
  runLocalAgent,
} from "@webmcp-agents/local-agent";

// The engine that generates text; the loop around it is runLocalAgent.
const provider = createTransformersProvider();

export const adapter: AgentAdapter = {
  id: "my-local",
  label: "My model",
  // Download the model before the first run (the chat's Download
  // card calls this from the person's click).
  prepare: (signal) => provider.prepare(() => {}, signal),
  run: (req) =>
    runLocalAgent(provider, req, {
      maxSteps: 4,
      maxTools: 6,
      toolsInline: provider.toolsInline,
      instructions: "add_to_cart exists only on a product's page.",
    }),
};
