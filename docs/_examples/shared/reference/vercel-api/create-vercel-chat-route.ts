import { defineWebAgent } from "@webmcp-agents/chat/agent";
import { createVercelChatRoute } from "@webmcp-agents/vercel-api";

const shopper = defineWebAgent({
  id: "shopper",
  instructions: ["You help people shop at Field Store."],
});

// api/chat.ts: the chat handler with sessions and a tool allowlist,
// behind origin, rate-limit and budget guards. Export all three;
// they are the same handler.
export const { GET, POST, OPTIONS } = createVercelChatRoute({
  app: "ecommerce",
  agents: [shopper],
  // Only these reach the model; the inline tools of components by id.
  tools: ["search_products", "add_to_cart", "checkout"],
});
