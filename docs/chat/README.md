---
slug: chat
---

# `@web-agents/chat`

A chat widget whose agent works the live page through its WebMCP tools (`document.modelContext`). The model runs on
your server (Claude via the Vercel AI SDK) with the key server-side; every tool call runs in the browser, so the agent
cursor from `@web-agents/core` plays as it does for any agent, and anything a form gates on a click waits for the
person. The same adapter contract also takes an on-device model ([`@web-agents/local-agent`](../local-agent/README.md)).

## Install

```bash
pnpm add @web-agents/chat @ai-sdk/anthropic   # @ai-sdk/anthropic: server only
```

Peer dependencies: `react` and `react-dom` (≥ 18); optional `@ai-sdk/anthropic` (≥ 4, for the server) and `vite`
(≥ 6, for the dev plugin).

## Entry points

| Import | What |
|---|---|
| `@web-agents/chat` | The widget, the cloud adapter, the session hook and reducer, tool helpers, adapter types |
| `@web-agents/chat/server` | The `/api/chat` handler, system prompt, request schema |
| `@web-agents/chat/vite` | A Vite plugin that serves `/api/chat` in `vite dev` |
| `@web-agents/chat/chat.css` | The widget's styles |

## Quick start

```tsx
// client
import { AgentChat, createCloudAdapter } from "@web-agents/chat";
import "@web-agents/chat/chat.css";

const cloud = createCloudAdapter(); // POSTs to /api/chat; create it once

<WebAgentsProvider tools={catalog}>
  …
  <AgentChat adapter={cloud} />
</WebAgentsProvider>
```

```ts
// api/chat.ts
import { createChatHandler } from "@web-agents/chat/server";
const handler = createChatHandler();
export const GET = handler;
export const POST = handler;
```

```ts
// vite.config.ts
import { webAgentsChatDev } from "@web-agents/chat/vite";
export default defineConfig({ plugins: [react(), webAgentsChatDev()] });
```

## API

| API | Entry | File |
|---|---|---|
| `AgentChat`, `AgentChatProps`, `chat.css` theming | `@web-agents/chat` | [agent-chat.md](./agent-chat.md) |
| `createCloudAdapter`, `CloudAdapterOptions` | `@web-agents/chat` | [create-cloud-adapter.md](./create-cloud-adapter.md) |
| `useAgentSession`, `AgentSession`, `UseAgentSessionOptions` | `@web-agents/chat` | [use-agent-session.md](./use-agent-session.md) |
| `sessionReducer`, `resumable`, `SessionAction`, `SessionState`, `SessionError` | `@web-agents/chat` | [session-reducer.md](./session-reducer.md) |
| `callModelContextTool`, `CallToolOptions`, `TOOL_TIMEOUT_MS`, `NAVIGATED`, `CANCELLED`, `isCancelled` | `@web-agents/chat` | [call-model-context-tool.md](./call-model-context-tool.md) |
| `listToolDescriptors` | `@web-agents/chat` | [list-tool-descriptors.md](./list-tool-descriptors.md) |
| `AgentAdapter`, `AdapterStatus`, `AgentRunRequest`, `AgentStreamPart`, `AgentMessage`, `AgentPart`, `ToolDescriptor`, `ToolOutput`, `ToolCallState` | `@web-agents/chat` | [adapter-types.md](./adapter-types.md) |
| `createChatHandler`, `ChatHandlerOptions`, `Effort`, `DEFAULT_MODEL` | `@web-agents/chat/server` | [create-chat-handler.md](./create-chat-handler.md) |
| `buildSystemPrompt`, `DEFAULT_SYSTEM_PROMPT` | `@web-agents/chat/server` | [system-prompt.md](./system-prompt.md) |
| `chatRequestSchema`, `LIMITS`, `ChatRequest` | `@web-agents/chat/server` | [chat-request-schema.md](./chat-request-schema.md) |
| `webAgentsChatDev`, `WebAgentsChatDevOptions` | `@web-agents/chat/vite` | [web-agents-chat-dev.md](./web-agents-chat-dev.md) |

## When a tool fails

A failed tool never ends the run: the result goes back to the model with a code (`Error [timeout]: …`), and the
system prompts say what to do per code. See [tool error codes](../core/tool-error.md) and
[`callModelContextTool`](./call-model-context-tool.md). If the run itself fails (the model, the network), Try again
resumes it from the last finished tool call ([`resumable`](./session-reducer.md#resumable)).

## Security

- The key never leaves the server; the client bundle contains no provider SDK.
- Every request is validated ([`chatRequestSchema`](./chat-request-schema.md)) and cross-site browser requests are
  refused (403).
- That is not abuse protection: a public deployment needs a `guard` ([`createChatHandler`](./create-chat-handler.md)).

## See also

- [`@web-agents/local-agent`](../local-agent/README.md)
- [Tool error codes](../core/tool-error.md)
- [Deploying the examples](../deploy.md)
