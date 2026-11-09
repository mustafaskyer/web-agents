# `createChatHandler`

Creates the `/api/chat` endpoint as a web-standard function, `(req: Request) => Promise<Response>`, so it runs on
Vercel, in any Node or edge server with web `Request`/`Response`, and in `vite dev`. One POST is one model step; the
model's tool calls stream back to the browser, which runs them on the live page.

```ts
import { createChatHandler, DEFAULT_MODEL } from "@webmcp-agents/chat/server";
import type { ChatHandlerOptions, ReasoningLevel } from "@webmcp-agents/chat/server";
```

Each POST is run by an AI SDK `ToolLoopAgent` built for the request from the registered [`WebAgent`](./define-web-agent.md)
the page named (instructions, tool subset, sub-agents, model), or from the plain assistant prompt.

## Signature

```ts
function createChatHandler(opts?: ChatHandlerOptions): (req: Request) => Promise<Response>;

const DEFAULT_MODEL = "anthropic/claude-opus-5-5";

type ReasoningLevel = "off" | "low" | "medium" | "high";

interface ChatHandlerOptions {
  model?: LanguageModel | string;
  system?: string;
  agents?: readonly WebAgent[];
  maxOutputTokens?: number;
  reasoning?: ReasoningLevel;
  effort?: Effort;                       // deprecated
  maxSteps?: number;
  guard?: (req: Request) => Promise<Response | undefined> | Response | undefined;
  beforeModel?: (req: Request) => Promise<Response | undefined> | Response | undefined;
  prepareAgent?: (
    settings: WebAgentSettings,
    context: { agent?: WebAgent; request: Request },
  ) => WebAgentSettings;
  env?: Record<string, string | undefined>;
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `model` | `LanguageModel \| string` | `env.WEB_AGENTS_MODEL ?? DEFAULT_MODEL` | A `"<provider>/<model>"` id resolved with the provider's key from `env` (`anthropic/…`, `openai/…`, `google/…`, `deepseek/…`, `xai/…`, `mistral/…`, `openrouter/<vendor>/<model>`, or any `a/b` id through the AI Gateway; see [`resolveModel`](./resolve-model.md)), a bare `claude-…` id, or any AI SDK `LanguageModel`. |
| `system` | `string` | `DEFAULT_SYSTEM_PROMPT` | System prompt. See [system prompt](./system-prompt.md). |
| `agents` | `readonly WebAgent[]` | `[]` | The agents the page may name ([`defineWebAgent`](./define-web-agent.md)); sub-agents are found through their parents. Their instructions, tool subsets and models are read from here by id, never from the request. |
| `maxOutputTokens` | `number` | `8192` | Output token cap per step. A thinking model's reasoning counts against it. |
| `reasoning` | `ReasoningLevel` | `"low"` | How hard the model thinks per step, for any provider that has the knob (see [`providerOptionsFor`](./resolve-model.md)). |
| `effort` | `Effort` | — | Deprecated: Anthropic's effort levels (`xhigh` / `max` map to `high`). Wins over `reasoning` when set. |
| `maxSteps` | `number` | `8` | Tool steps per user turn. The request after the last one gets no tools, so the model sums up. Same default as the cloud adapter. An agent's own `maxSteps` wins. |
| `prepareAgent` | `(settings, { agent, request }) => settings` | — | Tune the AI SDK `ToolLoopAgent` settings the handler built for the request (add `prepareStep`, telemetry, middleware). |
| `guard` | `(req) => Response \| undefined` (or a Promise) | — | Runs first (after the method and cross-site checks); return a Response to short-circuit. Rate limits, origin checks. |
| `beforeModel` | same as `guard` | — | Runs after validation, once chat is known to be enabled, right before the model call. Count budgets here, so malformed or refused requests never use them up. |
| `env` | `Record<string, string \| undefined>` | `process.env` (or `{}` without `process`) | Where the provider keys, `AI_GATEWAY_API_KEY` and `WEB_AGENTS_MODEL` are read. |

## Returns

A handler. By method and order:

| Request | Response |
|---|---|
| `OPTIONS` | `204` |
| Anything but `GET` / `POST` | `405 { error: "method_not_allowed" }` |
| A browser request from another origin (`Origin` differs) | `403 { error: "forbidden" }` |
| `guard` returned a Response | That Response |
| `GET` | `{ enabled, model, provider, agents }`: `enabled` is true with a model instance or the key the model needs; `agents` lists the registered ids |
| `POST`, no key for the model (and no instance) | `503 { error: "chat_disabled", message }`, the message naming the env var(s) to set |
| Not `application/json` | `415 bad_request` |
| Body over 1 MB (counted while streaming) | `413 bad_request` |
| Body not JSON | `400 bad_request` |
| Fails [`chatRequestSchema`](./chat-request-schema.md) | `400 { error: "bad_request", issues }` (first 10) |
| Names an agent not in `agents` | `400 { error: "bad_request", message: 'Unknown agent "…"' }` |
| `beforeModel` returned a Response | That Response |
| The provider package isn't installed | `503 { error: "chat_disabled", message: "Install @ai-sdk/… on the server …" }` |
| OK | An AI SDK UI message stream (SSE), reasoning included |
| The model call throws before streaming | `500 { error: "server_error" }` |

## Example

```ts
// api/chat.ts (Vercel): any runtime with web Request/Response works the same way
import { createChatHandler } from "@webmcp-agents/chat/server";

const handler = createChatHandler({
  agents: [shopper],                        // the same definitions the page passes to <AgentChat agent>
  model: "openai/gpt-5.5", // or WEB_AGENTS_MODEL; needs OPENAI_API_KEY (or AI_GATEWAY_API_KEY)
  reasoning: "low",
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
- With a model id the request carries that provider's reasoning options (Anthropic: `effort` and `fallbacks:
  "default"`). With a model instance none are set, and no provider SDK is loaded.
- A named agent: its instructions and the delegation note go into the system prompt, its `tools` filter and delegate
  tools shape the tool set (delegate descriptors sent by the page are ignored and rebuilt), its `model` is resolved
  with the server's keys, its `maxSteps` bounds the turn.
- Provider metadata on tool calls (Gemini thought signatures, OpenAI item ids) round-trips through the conversation
  like reasoning signatures.
- A call to an unknown tool, or with invalid input, goes back to the model as that call's error
  (`Error [unavailable]: …`, `Error [invalid_input]: …`). Other model errors are logged and streamed as
  "The assistant had a problem answering. Try again."
- The provider SDKs (`@ai-sdk/anthropic`, `@ai-sdk/openai`, …, `@openrouter/ai-sdk-provider`) are optional peer
  dependencies: install the one your model id needs on the server. The gateway needs none.

## See also

- [`defineWebAgent`](./define-web-agent.md), [`toToolLoopAgent`](./to-tool-loop-agent.md), [`resolveModel`](./resolve-model.md)
- [`webAgentsChatDev`](./web-agents-chat-dev.md)
- [`chatRequestSchema` and `LIMITS`](./chat-request-schema.md)
- [`buildSystemPrompt` and `DEFAULT_SYSTEM_PROMPT`](./system-prompt.md)
- [`createCloudAdapter`](./create-cloud-adapter.md)
- [Tool error codes](../core/tool-error.md)
