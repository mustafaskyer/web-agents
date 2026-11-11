// /api/chat on Vercel: the chat handler behind origin, rate-limit and budget guards (see docs/more/deploy.md).
import { createVercelChatRoute } from "@webmcp-agents/vercel-api";
import { shopper } from "../src/webmcp-agents/agents";
import { allowedTools } from "../src/webmcp-agents/tools";

export const { GET, POST, OPTIONS } = createVercelChatRoute({ app: "ecommerce", agents: [shopper], tools: allowedTools });
