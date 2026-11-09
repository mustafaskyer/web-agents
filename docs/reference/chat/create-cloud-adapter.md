# `createCloudAdapter`

An `AgentAdapter` backed by your `/api/chat` endpoint (a frontier model on your server). The model runs on the server;
every tool call runs on the page, one at a time, so the agent cursor plays.

```ts
import { createCloudAdapter } from "@webmcp-agents/chat";
```

## Signature

```ts
function createCloudAdapter(opts?: CloudAdapterOptions): AgentAdapter;

interface CloudAdapterOptions {
  api?: string;
  id?: string;
  maxSteps?: number;
  headers?: Record<string, string> | (() => Record<string, string>);
  fetch?: typeof fetch;
  label?: string;
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `api` | `string` | `"/api/chat"` | The chat endpoint. |
| `id` | `string` | `"cloud"` | The adapter's id (the switcher remembers the choice by it). Set one per endpoint when a page offers several cloud adapters. |
| `maxSteps` | `number` | `8` | Tool steps per user message. One more request follows the last step, and the server answers it without tools, so the model sums up. Keep it equal to the handler's `maxSteps`. |
| `headers` | `Record<string, string> \| (() => Record<string, string>)` | — | Extra request headers (auth, CSRF), or a function returning them per request. `content-type: application/json` is always sent. |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Injectable for tests and custom transports. |
| `label` | `string` | from the endpoint | Shown in the adapter switcher. Default: the model the endpoint's GET reports, e.g. "GPT-5.5 (cloud)" or "Claude Opus 5.5 via OpenRouter (cloud)"; Anthropic through its own SDK keeps "Claude (cloud)"; "Cloud" until the first check answers. |

## Returns

An [`AgentAdapter`](./adapter-types.md#agentadapter) with `id` (default `"cloud"`), a `label` getter, `status()`,
`subscribe()` and `run()` (no `prepare()`).

- **Status.** Starts as `loading`. The first `status()` call in a browser sends a `GET` to `api`: `{ enabled: true }`
  makes it `ready`; anything else is `unavailable` ("Chat isn't configured on this site."); a network failure is
  `unavailable` ("Couldn't reach the assistant…"). After a failure it checks again on a later `status()` call, at most
  every 10 s.
- **Run.** Each step POSTs `{ messages, tools, page: { url }, agent }`, reading `req.tools` fresh. `agent` is the
  page's agent **id** only (`req.agent?.id`): instructions never travel. A sub-agent's nested run (`agent` on a tool
  part) is stripped from the history before sending; the server sees the delegate call and its result. The agent's
  `maxSteps` wins over the option. The reply streams back as
  [`AgentStreamPart`](./adapter-types.md#agentstreampart)s. Tool calls run through `req.callTool()` in order, and their
  results go out with the next step. It ends with `finish` (`"stop"`, `"max-steps"` or `"aborted"`) or an `error`.

## Example

```ts
// apps/ecommerce/src/Root.tsx
const ADAPTERS = [createCloudAdapter(), createLocalAdapter({ instructions: STORE_INSTRUCTIONS })];

// with auth
const cloud = createCloudAdapter({
  api: "/api/assistant",
  headers: () => ({ authorization: `Bearer ${getToken()}` }),
});
```

## Notes

- Create it once per page (module scope).
- HTTP failures become `error` parts with a code the widget explains: 400/413/415 → `bad_request`, 429 →
  `rate_limited`, 503 with `error: "chat_disabled"` → `chat_disabled` (and the status turns `unavailable`). A 503 with
  `reason: "daily_budget"` or a 429 with `Retry-After` over an hour reads as a daily limit (`rate_limited`); any other 503 reads as
  "The assistant is busy". A thrown `fetch` or a broken stream is `network`.
- Tool results are truncated (4000 characters of text) when they are recorded, never later, so each request repeats
  the previous one's prefix: Claude's signed reasoning stays valid and the prompt cache keeps hitting.
- Past 160 messages (`LIMITS.messages`) the oldest are dropped, starting the window at a user message.
- A tool call whose input didn't parse arrives as `tool-call` then `tool-error` (`Error [invalid_input]: …`) and is
  never run.
- No provider SDK is in the client bundle; the API key stays on the server.

## See also

- [`createChatHandler`](./create-chat-handler.md): the server side
- [`webAgentsChatDev`](./web-agents-chat-dev.md): `/api/chat` in `vite dev`
- [`AgentChat`](./agent-chat.md)
- [Adapter types](./adapter-types.md)
