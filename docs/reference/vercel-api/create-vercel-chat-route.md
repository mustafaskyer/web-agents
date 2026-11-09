# `createVercelChatRoute`

Builds the `/api/chat` handlers for a Vercel Function: `@webmcp-agents/chat`'s handler behind origin and per-IP guards,
with a global daily budget on model calls. Every limit is an env var.

```ts
import { createVercelChatRoute } from "@webmcp-agents/vercel-api";
import type { VercelChatRouteOptions } from "@webmcp-agents/vercel-api";
```

## Signature

```ts
function createVercelChatRoute(options: VercelChatRouteOptions): {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
  OPTIONS: (req: Request) => Promise<Response>;
};

interface VercelChatRouteOptions {
  app: string;
  env?: Env;
  model?: LanguageModel | string;
  agents?: readonly WebAgent[];
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `app` | `string` | — | Namespaces the rate-limit keys per app (`<app>:minute`, `<app>:day`, `<app>:global`). |
| `env` | `Env` | `process.env` | Where every env var below is read. Also passed to the chat handler. |
| `model` | `LanguageModel \| string` | `env.WEB_AGENTS_MODEL ?? "anthropic/claude-sonnet-5-5"` | A model instance, or a `"<provider>/<model>"` id (see [`resolveModel`](../chat/resolve-model.md)). |
| `agents` | `readonly WebAgent[]` | — | The page's agents ([`defineWebAgent`](../chat/define-web-agent.md)): the same list the page passes to `<AgentChat>`. |

## Environment variables

| Var | Default | Used for |
|---|---|---|
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, … | — | The key of the provider in `WEB_AGENTS_MODEL` (see [`resolveModel`](../chat/resolve-model.md)). Without it `GET` reports `enabled: false` and `POST` answers 503 `chat_disabled`, naming the variable. |
| `AI_GATEWAY_API_KEY` | — | Serves any `a/b` model id through the AI Gateway when the provider's own key is missing. |
| `WEB_AGENTS_MODEL` | `"anthropic/claude-sonnet-5-5"` | The model, as `<provider>/<model>`, when `model` isn't passed. |
| `WEB_AGENTS_MAX_OUTPUT_TOKENS` | `4096` | Output token cap per model step. Thinking counts against it. |
| `WEB_AGENTS_MAX_STEPS` | `6` | Tool steps per user turn. |
| `RATE_LIMIT_PER_MINUTE` | `30` | Requests per IP per minute (fail open). |
| `RATE_LIMIT_PER_DAY` | `300` | Requests per IP per day (fail open). |
| `RATE_LIMIT_GLOBAL_DAILY` | `3000` | Model calls per day across all visitors (fail closed). |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | — | Upstash Redis for the limiters. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` also work. Without them limits are per instance. |

Numeric vars that are missing, not a number, or not greater than 0 fall back to the default.

## Returns

`{ GET, POST, OPTIONS }`, all the same handler. Export them from the function file.

## Example

From `apps/playground/api/chat.ts`:

```ts
// /api/chat on Vercel: the chat handler behind origin, rate-limit and budget guards (see docs/guides/deploy.md).
import { createVercelChatRoute } from "@webmcp-agents/vercel-api";

export const { GET, POST, OPTIONS } = createVercelChatRoute({ app: "playground" });
```

With agents (`apps/ecommerce/api/chat.ts`):

```ts
import { createVercelChatRoute } from "@webmcp-agents/vercel-api";
import { shopper } from "../src/agents";

export const { GET, POST, OPTIONS } = createVercelChatRoute({ app: "ecommerce", agents: [shopper] });
```

## Notes

- Env is read when the route is created (the function's cold start), not at import time.
- Each tool step is one request: a 6-step turn is 7. The per-minute limit must leave room for a few turns.
- The budget is checked in the handler's `beforeModel` hook, after validation, so malformed requests never use it up.
- The per-IP limiters fail open (a Redis outage must not take the chat down). The global budget fails closed (an
  outage must not turn into an unbounded bill); the chat then answers 503 with reason `busy`.
- The step cap is counted from the conversation the browser sends, so a scripted caller can sidestep it. The budget
  is what bounds the bill.
- Never prefix these vars with `VITE_`: Vite ships `VITE_*` variables to the browser.

## See also

- [guards.md](./guards.md)
- [limiter.md](./limiter.md)
- [Deploy to Vercel](../../guides/deploy.md): setting the env vars on Vercel
