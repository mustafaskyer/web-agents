---
description: "Creates an AgentAdapter backed by your /api/chat endpoint: the model runs on your server and every tool call runs on the page, one at a time, so the agent cursor plays."
---

# `createCloudAdapter`

Creates an `AgentAdapter` backed by your `/api/chat` endpoint: the model runs on your server and every tool call runs on the page, one at a time, so the agent cursor plays. You rarely call it yourself: [`<AgentChat>`](./agent-chat.md), [`useAgentChat`](./use-agent-chat.md), [`useWebAgent`](./use-web-agent.md) and `agent.invoke` share one `createCloudAdapter()` when given no adapter. Create your own for a different endpoint, headers, step budget or label, or to offer it beside an on-device adapter.

## Import

```ts
import { createCloudAdapter } from "@webmcp-agents/chat";
import type { CloudAdapterOptions } from "@webmcp-agents/chat";
```

## Example

An adapter for a protected endpoint, passed to the chat. Create it once, at module scope, not during render.

<include meta='title="components/assistant.tsx"'>/_examples/shared/reference/chat/create-cloud-adapter.tsx</include>

## Options

`createCloudAdapter(options?)` takes a `CloudAdapterOptions`; every option is optional.

| Name | Type | Default | Description |
|---|---|---|---|
| `api` | `string` | `"/api/chat"` | The chat endpoint. A `GET` to it reports whether chat is configured and which model runs; a `POST` runs one model step. See [`createChatHandler`](./create-chat-handler.md). |
| `id` | `string` | `"cloud"` | The adapter's id; the switcher remembers the person's choice by it. Set one per endpoint when a page offers several cloud adapters. |
| `maxSteps` | `number` | `8` | Tool steps per user message. One more request follows the last step and the server answers it without tools, so the model sums up. An agent's own `maxSteps` wins. Keep it equal to the handler's `maxSteps`. |
| `headers` | `Record<string, string> \| (() => Record<string, string>)` | — | Extra request headers (auth, CSRF), or a function returning them for each request. `content-type: application/json` is always sent. |
| `fetch` | `typeof fetch` | `globalThis.fetch` | The function that makes requests. For tests and custom transports. |
| `label` | `string` | from the endpoint | The name in the adapter switcher. By default the model the endpoint's `GET` reports, for example "GPT-5.5 (cloud)" or "Claude Opus 5.5 via OpenRouter (cloud)"; Anthropic through its own SDK keeps "Claude (cloud)"; "Cloud" until the first check answers. |

## Returns

An [`AgentAdapter`](./adapter-types.md#agentadapter) with `id` (default `"cloud"`), a `label` getter, `status()`, `subscribe()` and `run()`. It has no `prepare()` and no `models()`.

- **Status.** Starts as `loading`. The first `status()` call in a browser sends a `GET` to `api`: `{ enabled: true }` makes it `ready`; anything else is `unavailable` ("Chat isn't configured on this site."); a network failure is `unavailable` ("Couldn't reach the assistant…"). After a failure it checks again on a later `status()` call, at most every 10 s.
- **Run.** Each step POSTs `{ messages, tools, page: { url }, agent }`, reading `req.tools` fresh. `agent` is the page's agent **id** only (`req.agent?.id`): instructions never travel. A sub-agent's nested run (`agent` on a tool part) is stripped from the history first; the server sees the delegate call and its result. The reply streams back as [`AgentStreamPart`](./adapter-types.md#agentstreampart)s. Tool calls run through `req.callTool()` in order and their results go out with the next step. The run ends with `finish` (`"stop"`, `"max-steps"` or `"aborted"`) or an `error`.

## Notes

- HTTP failures become `error` parts with a code the widget explains: 400, 413 and 415 are `bad_request`, 429 is `rate_limited`, a 503 with `error: "chat_disabled"` is `chat_disabled` (and the status turns `unavailable`). A 503 with `reason: "daily_budget"`, or a 429 with `Retry-After` over an hour, reads as a daily limit (`rate_limited`); any other 503 reads as "The assistant is busy". A thrown `fetch` or a broken stream is `network`.
- Tool results are truncated (4000 characters of text) when they are recorded, never later, so each request repeats the previous one's prefix: Claude's signed reasoning stays valid and the prompt cache keeps hitting.
- Past 160 messages ([`LIMITS`](./chat-request-schema.md#limits)`.messages`) the oldest are dropped, starting the window at a user message.
- A tool call whose input did not parse arrives as `tool-call` then `tool-error` (`Error [invalid_input]: …`) and is never run.
- No provider SDK is in the client bundle; the API key stays on the server.

## See also

- [Add the chat](../../build/add-the-chat.mdx), the page that teaches it
- [`createChatHandler`](./create-chat-handler.md), the server side
- [`webAgentsChatDev`](./web-agents-chat-dev.md), `/api/chat` in `vite dev`
- [`<AgentChat>`](./agent-chat.md)
- [Adapter types](./adapter-types.md)
