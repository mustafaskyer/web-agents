import { createChatHandler } from "@webmcp-agents/chat/server";

import { agents } from "@/agents";
import { allowedTools } from "@/allowed-tools";

// /api/chat, locked down. Reads the key,
// WEB_AGENTS_SESSION_SECRET and TURNSTILE_SECRET_KEY from
// process.env, on the server.
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
    turnstile: Boolean(process.env.TURNSTILE_SECRET_KEY),
  },
});

export const GET = handler;
export const POST = handler;
