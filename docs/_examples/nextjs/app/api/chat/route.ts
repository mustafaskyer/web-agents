import { createChatHandler } from "@webmcp-agents/chat/server";

import { agents } from "@/agents";

// A route handler runs on the server only. It reads the key and
// WEB_AGENTS_MODEL from process.env.
const handler = createChatHandler({ agents });

export const GET = handler;
export const POST = handler;
