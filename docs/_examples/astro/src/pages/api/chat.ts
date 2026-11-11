import type { APIRoute } from "astro";
import { getSecret } from "astro:env/server";
import { createChatHandler } from "@webmcp-agents/chat/server";

import { agents } from "@/agents";

// A server endpoint, not a static page: it needs an adapter
// (Node, Vercel, Netlify, …).
export const prerender = false;

// getSecret reads .env.local in development and the server's
// environment in production. Add your provider's key if it is not
// Anthropic's.
const handler = createChatHandler({
  agents,
  env: {
    ANTHROPIC_API_KEY: getSecret("ANTHROPIC_API_KEY"),
    WEB_AGENTS_MODEL: getSecret("WEB_AGENTS_MODEL"),
  },
});

export const GET: APIRoute = ({ request }) => handler(request);
export const POST: APIRoute = ({ request }) => handler(request);
