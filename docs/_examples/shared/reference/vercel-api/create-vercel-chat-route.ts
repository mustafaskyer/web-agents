import { defineWebAgent } from "@webmcp-agents/chat/agent";
import { createVercelChatRoute } from "@webmcp-agents/vercel-api";

const shopper = defineWebAgent({
  id: "shopper",
  instructions: ["You help people shop at Field Store."],
});

// api/chat.ts: the chat handler behind origin, rate-limit and
// budget guards. Export all three; they are the same handler.
export const { GET, POST, OPTIONS } = createVercelChatRoute({
  app: "ecommerce",
  agents: [shopper],
});
