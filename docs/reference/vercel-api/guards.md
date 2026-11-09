# Guards

Guards for a public `/api/chat`. They run before the model and answer with the statuses the chat widget already
explains (403, 429 `rate_limited`, 503). Only `POST` is limited: `GET` is the capability check and `OPTIONS` a
preflight.

```ts
import { budgetGuard, clientIp, composeGuards, originGuard, rateLimitGuard } from "@webmcp-agents/vercel-api";
import type { Guard } from "@webmcp-agents/vercel-api";
```

## Signature

```ts
/** Returns a Response to refuse the request, or undefined to let it through. */
type Guard = (req: Request) => Promise<Response | undefined> | Response | undefined;

function composeGuards(...guards: Guard[]): Guard;
function originGuard(): Guard;
function rateLimitGuard(...limiters: Limiter[]): Guard;
function budgetGuard(limiter: Limiter): Guard;
function clientIp(req: Request): string;
```

## Parameters

| Function | Parameter | Type | Description |
|---|---|---|---|
| `composeGuards` | `guards` | `Guard[]` | Run in order; the first refusal wins. |
| `originGuard` | — | — | — |
| `rateLimitGuard` | `limiters` | `Limiter[]` | Each is asked with the client IP as key. |
| `budgetGuard` | `limiter` | `Limiter` | Asked with the key `"global"`. |
| `clientIp` | `req` | `Request` | The incoming request. |

## Returns

| Function | Refuses with |
|---|---|
| `composeGuards` | The first refusing guard's response, else `undefined`. |
| `originGuard` | 403 `{ "error": "forbidden_origin" }` when a `POST` has no `Origin` or one that differs from the request URL's origin. |
| `rateLimitGuard` | 429 `{ "error": "rate_limited" }` with `retry-after` in seconds (at least 1), when any limiter refuses. |
| `budgetGuard` | 503 `{ "error": "unavailable", "reason": "daily_budget" }` past the cap, or `"reason": "busy"` when storage failed (`degraded`). |
| `clientIp` | Returns the first `x-forwarded-for` entry, else `x-real-ip`, else `"anon"` (one shared bucket). |

Refusals are JSON with `cache-control: no-store`.

## Example

How `createVercelChatRoute` wires them (`packages/vercel-api/src/index.ts`):

```ts
import { createChatHandler } from "@webmcp-agents/chat/server";
import { budgetGuard, composeGuards, createLimiter, originGuard, rateLimitGuard } from "@webmcp-agents/vercel-api";

const env = process.env;
const handler = createChatHandler({
  env,
  guard: composeGuards(
    originGuard(),
    rateLimitGuard(
      createLimiter({ env, prefix: "shop:minute", limit: 30, window: "1 m", failOpen: true }),
      createLimiter({ env, prefix: "shop:day", limit: 300, window: "1 d", failOpen: true }),
    ),
  ),
  beforeModel: budgetGuard(createLimiter({ env, prefix: "shop:global", limit: 3000, window: "1 d", failOpen: false })),
});
```

## Notes

- `originGuard` is not real protection on its own: any script can send a fake `Origin`. It stops casual scripts. The
  rate limits and the budget are the protection. The chat handler already refuses a different `Origin`; this guard
  adds "no Origin, no chat".
- When several limiters refuse, `rateLimitGuard` reports the longest wait, so a refused daily window reads as
  "tomorrow", not "in a minute".
- Use `budgetGuard` as the handler's `beforeModel` hook, not `guard`, so only validated requests that reach the
  model count.
- `clientIp` reads `x-forwarded-for` as set by Vercel's proxy. Requests with neither header share the `"anon"` bucket.

## See also

- [limiter.md](./limiter.md)
- [create-vercel-chat-route.md](./create-vercel-chat-route.md)
