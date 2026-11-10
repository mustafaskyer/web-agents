---
description: "Guards for a public /api/chat: functions that run before the model and refuse a request with the statuses the chat widget already explains (403, 429 rate_limited, 503)."
---

# Guards

Guards for a public `/api/chat`: functions that run before the model and refuse a request with the statuses the chat widget already explains (403, 429 `rate_limited`, 503). Reach for them when you assemble the handler yourself; [`createVercelChatRoute`](./create-vercel-chat-route.md) already composes them. Only `POST` is limited: `GET` is the capability check and `OPTIONS` a preflight.

## Import

```ts
import {
  budgetGuard,
  clientIp,
  composeGuards,
  originGuard,
  rateLimitGuard,
} from "@webmcp-agents/vercel-api";
import type { Guard } from "@webmcp-agents/vercel-api";
```

## Example

How `createVercelChatRoute` wires them:

<include meta='title="api/chat.ts"'>/_examples/shared/reference/vercel-api/guards.ts</include>

## Options

A `Guard` is `(req: Request) => Promise<Response | undefined> | Response | undefined`: it returns a `Response` to refuse the request, or `undefined` to let it through.

| Name | Type | Default | Description |
|---|---|---|---|
| `composeGuards(...guards)` | `Guard[]` | required | Runs the guards in order; the first refusal wins. |
| `originGuard()` | none | none | Takes no arguments. |
| `rateLimitGuard(...limiters)` | `Limiter[]` | required | Each limiter is asked with the client IP as key. List a per-minute and a per-day limiter. |
| `budgetGuard(limiter)` | `Limiter` | required | The limiter that counts model calls across all visitors; asked with the key `"global"`. |
| `clientIp(req)` | `Request` | required | The incoming request. |

## Returns

| Name | Type | Description |
|---|---|---|
| `composeGuards` | `Guard` | The first refusing guard's response, else `undefined`. |
| `originGuard` | `Guard` | Refuses with 403 `{ "error": "forbidden_origin" }` when a `POST` has no `Origin` or one that differs from the request URL's origin. |
| `rateLimitGuard` | `Guard` | Refuses with 429 `{ "error": "rate_limited" }` and a `retry-after` header in seconds (at least 1), when any limiter refuses. |
| `budgetGuard` | `Guard` | Refuses with 503 `{ "error": "unavailable", "reason": "daily_budget" }` past the cap, or `"reason": "busy"` when storage failed (`degraded`). |
| `clientIp` | `string` | The first `x-forwarded-for` entry, else `x-real-ip`, else `"anon"` (one shared bucket). |

Refusals are JSON with `cache-control: no-store`.

## Notes

- `originGuard` is not real protection on its own: any script can send a fake `Origin`. It stops casual scripts; the rate limits and the budget are the protection. The chat handler already refuses a different `Origin`; this guard adds "no Origin, no chat".
- When several limiters refuse, `rateLimitGuard` reports the longest wait, so a refused daily window reads as "tomorrow", not "in a minute".
- Use `budgetGuard` as the handler's `beforeModel` hook, not `guard`, so only validated requests that reach the model count.
- `clientIp` reads `x-forwarded-for` as set by Vercel's proxy. Requests with neither header share the `"anon"` bucket.

## See also

- [Deploy](../../more/deploy.md)
- [`createLimiter`](./limiter.md), the counters the guards use
- [`createVercelChatRoute`](./create-vercel-chat-route.md)
- [`createChatHandler`](../chat/create-chat-handler.md), which takes `guard` and `beforeModel`
