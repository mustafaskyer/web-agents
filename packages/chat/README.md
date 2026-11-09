# @webmcp-agents/chat

A chat widget whose agent works the **live page** through its WebMCP tools. The model runs on your server (any frontier
model through the Vercel AI SDK: Claude by default, or OpenAI, Gemini, DeepSeek, Grok, Mistral, OpenRouter, the AI
Gateway) with the key server-side; every tool call runs **in the browser**, under the agent cursor, and anything a form
gates on a click waits for the person. `defineWebAgent` gives the assistant its instructions, a tool subset and
sub-agents, shared by the browser and the server.

```sh
pnpm add @webmcp-agents/chat @ai-sdk/anthropic   # the SDK of your provider, server only
```

```ts
// src/agents.ts: shared by the page, vite.config.ts and api/chat.ts (plain data, no secrets)
import { defineWebAgent } from "@webmcp-agents/chat/agent";
export const shopper = defineWebAgent({ id: "shopper", instructions: "Find products with search_products; open one before adding it." });
```

```tsx
import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";
import "@webmcp-agents/chat/chat.css";

const cloud = createCloudAdapter(); // POSTs to /api/chat; once, at module scope

<WebAgentsProvider tools={catalog}>
  <App />
  <AgentChat adapter={cloud} agent={shopper} />
</WebAgentsProvider>;
```

```ts
// api/chat.ts: any runtime with web Request/Response
import { createChatHandler } from "@webmcp-agents/chat/server";
import { shopper } from "../src/agents";
const handler = createChatHandler({ agents: [shopper] });   // model: WEB_AGENTS_MODEL, e.g. openai/gpt-5.5 with OPENAI_API_KEY
export const GET = handler;
export const POST = handler;
```

In development, `webAgentsChatDev({ agents: [shopper] })` from `@webmcp-agents/chat/vite` serves `/api/chat`; put the
provider's key in `.env.local` (never with a `VITE_` prefix: the plugin refuses it). A public deployment needs rate
limits and a budget.

## Docs

- [Add a chat](https://github.com/mustafaskyer/web-agents/blob/main/docs/guides/chat.mdx): setup, how a turn runs, options, picking a model, security
- [Define an agent](https://github.com/mustafaskyer/web-agents/blob/main/docs/guides/agents.mdx): instructions, tool subsets, sub-agents, a model per agent
- [Run the agent on the device](https://github.com/mustafaskyer/web-agents/blob/main/docs/guides/on-device-agent.mdx)
- [Deploy to Vercel](https://github.com/mustafaskyer/web-agents/blob/main/docs/guides/deploy.md)
- [API reference](https://github.com/mustafaskyer/web-agents/blob/main/docs/reference/chat/README.md)
