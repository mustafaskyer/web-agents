# `createChatHandler`

Creates the `/api/chat` endpoint as a web-standard function, `(req: Request) => Promise<Response>`, so it runs on
Vercel, in any Node or edge server with web `Request`/`Response`, and in `vite dev`. One POST is one model step; the
model's tool calls stream back to the browser, which runs them on the live page.

```ts
import { createChatHandler, DEFAULT_MODEL } from "@webmcp-agents/chat/server";
import type { ChatHandlerOptions, Effort } from "@webmcp-agents/chat/server";
```

## Signature

```ts
function createChatHandler(opts?: ChatHandlerOptions): (req: Request) => Promise<Response>;

const DEFAULT_MODEL = "claude-opus-5-5";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

interface ChatHandlerOptions {
  model?: LanguageModel | string;
  system?: string;
  maxOutputTokens?: number;
  effort?: Effort;
  maxSteps?: number;
  guard?: (req: Request) => Promise<Response | undefined> | Response | undefined;
  beforeModel?: (req: Request) => Promise<Response | undefined> | Response | undefined;
  env?: Record<string, string | undefined>;
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `model` | `LanguageModel \| string` | `env.WEB_AGENTS_MODEL ?? DEFAULT_MODEL` | A Claude model id for `@ai-sdk/anthropic`, or any AI SDK `LanguageModel`. |
| `system` | `string` | `DEFAULT_SYSTEM_PROMPT` | System prompt. See [system prompt](./system-prompt.md). |
| `maxOutputTokens` | `number` | `8192` | Output token cap per step. Claude's thinking counts against it. |
| `effort` | `Effort` | `"low"` | Claude effort per step (model ids only). |
| `maxSteps` | `number` | `8` | Tool steps per user turn. The request after the last one gets no tools, so the model sums up. Same default as the cloud adapter. |
| `guard` | `(req) => Response \| undefined` (or a Promise) | — | Runs first (after the method and cross-site checks); return a Response to short-circuit. Rate limits, origin checks. |
| `beforeModel` | same as `guard` | — | Runs after validation, once chat is known to be enabled, right before the model call. Count budgets here, so malformed or refused requests never use them up. |
| `env` | `Record<string, string \| undefined>` | `process.env` (or `{}` without `process`) | Where `ANTHROPIC_API_KEY` and `WEB_AGENTS_MODEL` are read. |

## Returns

A handler. By method and order:

| Request | Response |
|---|---|
| `OPTIONS` | `204` |
| Anything but `GET` / `POST` | `405 { error: "method_not_allowed" }` |
| A browser request from another origin (`Origin` differs) | `403 { error: "forbidden" }` |
| `guard` returned a Response | That Response |
| `GET` | `{ enabled, model }`: `enabled` is true with a model instance or an API key |
| `POST`, no key and no model instance | `503 { error: "chat_disabled" }` |
| Not `application/json` | `415 bad_request` |
| Body over 1 MB (counted while streaming) | `413 bad_request` |
| Body not JSON | `400 bad_request` |
| Fails [`chatRequestSchema`](./chat-request-schema.md) | `400 { error: "bad_request", issues }` (first 10) |
| `beforeModel` returned a Response | That Response |
| OK | An AI SDK UI message stream (SSE), reasoning included |
| The model call throws before streaming | `500 { error: "server_error" }` |

## Example

```ts
// api/chat.ts (Vercel): any runtime with web Request/Response works the same way
import { createChatHandler } from "@webmcp-agents/chat/server";

const handler = createChatHandler({
  guard: (req) => (rateLimited(req) ? new Response("Too many requests", { status: 429 }) : undefined),
});
export const GET = handler;
export const POST = handler;
```

The example apps wrap it with origin, rate-limit and budget guards through `@webmcp-agents/vercel-api`
(`apps/*/api/chat.ts`).

## Notes

- **A public deployment needs `guard`.** Cross-site browser requests are refused, but anyone can still call the
  endpoint directly (requests without `Origin` pass).
- Page tools are declared without `execute`, with control characters stripped from descriptions and `$schema` / `$id`
  removed from schemas. Tool descriptions go in tool definitions only, never the system prompt.
- Of the page, only its path reaches the prompt, and only from a same-origin browser request.
- When the turn already has `maxSteps` assistant messages with tool calls, the request gets no tools and the system
  prompt asks for a summary.
- With a Claude model id the request sets `effort` and `fallbacks: "default"` (server-side refusal fallbacks). With a
  model instance neither is set, and `@ai-sdk/anthropic` is never loaded.
- A call to an unknown tool, or with invalid input, goes back to the model as that call's error
  (`Error [unavailable]: …`, `Error [invalid_input]: …`). Other model errors are logged and streamed as
  "The assistant had a problem answering. Try again."
- `@ai-sdk/anthropic` is an optional peer dependency: install it on the server when you pass a model id.

## See also

- [`webAgentsChatDev`](./web-agents-chat-dev.md)
- [`chatRequestSchema` and `LIMITS`](./chat-request-schema.md)
- [`buildSystemPrompt` and `DEFAULT_SYSTEM_PROMPT`](./system-prompt.md)
- [`createCloudAdapter`](./create-cloud-adapter.md)
- [Tool error codes](../core/tool-error.md)
