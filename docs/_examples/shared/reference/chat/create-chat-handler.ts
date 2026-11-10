import { createChatHandler } from "@webmcp-agents/chat/server";

import { agents } from "@/agents";

// A crude per-client limit; use a real store in production.
const seen = new Map<string, number>();

const handler = createChatHandler({
  // The same definitions the page passes to <AgentChat agent>.
  agents,
  model: "openai/gpt-5.5", // needs OPENAI_API_KEY
  reasoning: "low",
  maxSteps: 8,

  // Runs first: a Response here ends the request.
  guard: (req) => {
    const who = req.headers.get("x-forwarded-for") ?? "local";
    const count = (seen.get(who) ?? 0) + 1;
    seen.set(who, count);
    return count > 100
      ? new Response("Too many requests", { status: 429 })
      : undefined;
  },
});

export const GET = handler;
export const POST = handler;
