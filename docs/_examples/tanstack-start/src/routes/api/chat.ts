import { createFileRoute } from "@tanstack/react-router";
import { createChatHandler } from "@webmcp-agents/chat/server";

import { agents } from "@/agents";

// Reads the key and WEB_AGENTS_MODEL from process.env, on the server.
const handler = createChatHandler({ agents });

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: ({ request }) => handler(request),
      POST: ({ request }) => handler(request),
    },
  },
});
