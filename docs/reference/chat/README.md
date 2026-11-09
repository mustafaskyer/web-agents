---
slug: reference/chat
---

# `@webmcp-agents/chat`

A chat widget whose agent works the live page through its WebMCP tools (`document.modelContext`). The model runs on
your server (any frontier model through the Vercel AI SDK: Claude by default, or OpenAI, Gemini, DeepSeek, Grok,
Mistral, OpenRouter, the AI Gateway) with the key server-side; every tool call runs in the browser, so the agent
cursor from `@webmcp-agents/core` plays as it does for any agent, and anything a form gates on a click waits for the
person. `defineWebAgent` gives the assistant its instructions, a tool subset and sub-agents, shared by the browser and
the server; each request is run by an AI SDK `ToolLoopAgent` built from it. The same adapter contract also takes an
on-device model ([`@webmcp-agents/local-agent`](../local-agent/README.md)).

## Install

```bash
pnpm add @webmcp-agents/chat
pnpm add @ai-sdk/anthropic   # the SDK of your model's provider, server only (none for the AI Gateway)
```

Peer dependencies: `react` and `react-dom` (≥ 18); optional, for the server: `@ai-sdk/anthropic`, `@ai-sdk/openai`,
`@ai-sdk/google`, `@ai-sdk/deepseek`, `@ai-sdk/xai`, `@ai-sdk/mistral`, `@openrouter/ai-sdk-provider` (the one your
model id needs); optional `vite` (≥ 6, for the dev plugin).

## Entry points

| Import | What |
|---|---|
| `@webmcp-agents/chat` | The widget, `defineWebAgent`, the cloud adapter, the session hook and reducer, tool helpers, adapter types |
| `@webmcp-agents/chat/agent` | `defineWebAgent` alone: plain data, importable from `vite.config.ts` and `api/chat.ts` |
| `@webmcp-agents/chat/server` | The `/api/chat` handler, `resolveModel`, `toToolLoopAgent`, system prompt, request schema |
| `@webmcp-agents/chat/vite` | A Vite plugin that serves `/api/chat` in `vite dev` |
| `@webmcp-agents/chat/chat.css` | The widget's styles |

## Quick start

```tsx
// client
import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";
import "@webmcp-agents/chat/chat.css";

const cloud = createCloudAdapter(); // POSTs to /api/chat; create it once

<WebAgentsProvider tools={catalog}>
  …
  <AgentChat adapter={cloud} />
</WebAgentsProvider>
```

```ts
// api/chat.ts
import { createChatHandler } from "@webmcp-agents/chat/server";
const handler = createChatHandler();
export const GET = handler;
export const POST = handler;
```

```ts
// vite.config.ts
import { webAgentsChatDev } from "@webmcp-agents/chat/vite";
export default defineConfig({ plugins: [react(), webAgentsChatDev()] });
```

## API

| API | Entry | File |
|---|---|---|
| `AgentChat`, `AgentChatProps`, `chat.css` theming | `@webmcp-agents/chat` | [agent-chat.md](./agent-chat.md) |
| `defineWebAgent`, `WebAgent`, `WebAgentConfig`, `selectTools`, `delegateTool`, `flattenWebAgents` | `@webmcp-agents/chat/agent` | [define-web-agent.md](./define-web-agent.md) |
| `createCloudAdapter`, `CloudAdapterOptions` | `@webmcp-agents/chat` | [create-cloud-adapter.md](./create-cloud-adapter.md) |
| `useAgentChat`, `AgentChatState`, `ToolPhase`, `UseAgentChatOptions` | `@webmcp-agents/chat` | [use-agent-chat.md](./use-agent-chat.md) |
| `useAgentSession`, `AgentSession`, `UseAgentSessionOptions` | `@webmcp-agents/chat` | [use-agent-session.md](./use-agent-session.md) |
| `sessionReducer`, `resumable`, `SessionAction`, `SessionState`, `SessionError` | `@webmcp-agents/chat` | [session-reducer.md](./session-reducer.md) |
| `callModelContextTool`, `CallToolOptions`, `TOOL_TIMEOUT_MS`, `NAVIGATED`, `CANCELLED`, `isCancelled` | `@webmcp-agents/chat` | [call-model-context-tool.md](./call-model-context-tool.md) |
| `listToolDescriptors` | `@webmcp-agents/chat` | [list-tool-descriptors.md](./list-tool-descriptors.md) |
| `AgentAdapter`, `AdapterStatus`, `AgentRunRequest`, `AgentStreamPart`, `AgentMessage`, `AgentPart`, `ToolDescriptor`, `ToolOutput`, `ToolCallState` | `@webmcp-agents/chat` | [adapter-types.md](./adapter-types.md) |
| `createChatHandler`, `ChatHandlerOptions`, `ReasoningLevel`, `DEFAULT_MODEL` | `@webmcp-agents/chat/server` | [create-chat-handler.md](./create-chat-handler.md) |
| `toToolLoopAgent`, `toToolLoopAgentSettings`, `toToolSet` | `@webmcp-agents/chat/server` | [to-tool-loop-agent.md](./to-tool-loop-agent.md) |
| `resolveModel`, `modelAvailability`, `parseModelId`, `providerOptionsFor`, `displayName`, `PROVIDERS`, `ModelUnavailableError` | `@webmcp-agents/chat/server` | [resolve-model.md](./resolve-model.md) |
| `buildSystemPrompt`, `DEFAULT_SYSTEM_PROMPT` | `@webmcp-agents/chat/server` | [system-prompt.md](./system-prompt.md) |
| `chatRequestSchema`, `LIMITS`, `ChatRequest` | `@webmcp-agents/chat/server` | [chat-request-schema.md](./chat-request-schema.md) |
| `webAgentsChatDev`, `WebAgentsChatDevOptions` | `@webmcp-agents/chat/vite` | [web-agents-chat-dev.md](./web-agents-chat-dev.md) |

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

- [`@webmcp-agents/local-agent`](../local-agent/README.md)
- [Tool error codes](../core/tool-error.md)
- [Deploy to Vercel](../../guides/deploy.md)
