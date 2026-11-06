// /api/chat on Vercel: the chat handler behind origin, rate-limit and budget guards (see docs/deploy.md).
import { createVercelChatRoute } from "@web-agents/vercel-api";

export const { GET, POST, OPTIONS } = createVercelChatRoute({ app: "playground" });
