import { createChatHandler } from "@webmcp-agents/chat/server";

import { agents } from "../src/agents";

// /api/chat in production: any host that runs a web-standard
// (Request) => Response function. It reads the key and
// WEB_AGENTS_MODEL from process.env, on the server.
const handler = createChatHandler({ agents });

export const GET = handler;
export const POST = handler;
