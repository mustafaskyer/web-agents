// /api/chat on Vercel: the chat handler behind origin, rate-limit and budget guards (see docs/deploy.md).
import { createVercelChatRoute } from "@webmcp-agents/vercel-api";

export const { GET, POST, OPTIONS } = createVercelChatRoute({ app: "ecommerce" });
