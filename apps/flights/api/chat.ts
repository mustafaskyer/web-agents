// /api/chat on Vercel: the chat handler behind origin, rate-limit and budget guards (see docs/more/deploy.md).
import { createVercelChatRoute } from "@webmcp-agents/vercel-api";
import { concierge } from "../src/agents";

export const { GET, POST, OPTIONS } = createVercelChatRoute({ app: "flights", agents: [concierge] });
