import type { APIRoute } from "astro";
import { getSecret } from "astro:env/server";
import { createChatHandler } from "@webmcp-agents/chat/server";

import { agents } from "@/agents";
import { allowedTools } from "@/allowed-tools";

export const prerender = false;

const handler = createChatHandler({
  agents,
  // A request must name one of them.
  requireAgent: true,

  // Only these tools reach the model.
  tools: allowedTools,

  // The page's first GET starts a session (a signed, httpOnly
  // cookie); a POST without one gets 401. With Turnstile set up,
  // a session needs a solved challenge.
  session: {
    turnstile: Boolean(getSecret("TURNSTILE_SECRET_KEY")),
  },

  // getSecret reads .env.local in development and the server's
  // environment in production.
  env: {
    ANTHROPIC_API_KEY: getSecret("ANTHROPIC_API_KEY"),
    WEB_AGENTS_MODEL: getSecret("WEB_AGENTS_MODEL"),
    WEB_AGENTS_SESSION_SECRET: getSecret("WEB_AGENTS_SESSION_SECRET"),
    TURNSTILE_SECRET_KEY: getSecret("TURNSTILE_SECRET_KEY"),
  },
});

export const GET: APIRoute = ({ request }) => handler(request);
export const POST: APIRoute = ({ request }) => handler(request);
