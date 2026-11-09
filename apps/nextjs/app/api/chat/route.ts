/**
 * /api/chat: the chat handler behind origin, rate-limit and budget guards (the same route the Vite examples deploy).
 * The key and the model come from the server env; the page sends only the agent's id.
 */
import { createVercelChatRoute } from "@webmcp-agents/vercel-api";
import { shopper } from "@/agents";
import { env } from "@/lib/env.server";

export const { GET, POST, OPTIONS } = createVercelChatRoute({ app: "nextjs", agents: [shopper], model: env.model });
