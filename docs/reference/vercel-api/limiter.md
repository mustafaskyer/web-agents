---
description: "A sliding-window request counter for the public demos."
---

# `createLimiter`

A sliding-window request counter for the public demos. It uses Upstash Redis over REST when its environment is present, so limits hold across serverless instances. Otherwise it counts in memory per instance, which keeps local dev and unconfigured previews working. Feed it to [`rateLimitGuard`](./guards.md) or [`budgetGuard`](./guards.md).

## Import

```ts
import {
  createLimiter,
  createMemoryLimiter,
  redisCredentials,
} from "@webmcp-agents/vercel-api";
import type {
  Env,
  Limiter,
  LimiterOptions,
  LimitResult,
} from "@webmcp-agents/vercel-api";
```

## Example

<include meta='title="limiter.ts"'>/_examples/shared/reference/vercel-api/limiter.ts</include>

## Options

### `createLimiter(options)`

`createLimiter` takes a `LimiterOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `env` | `Env` | required | Where the Upstash credentials are read (`KV_REST_API_*` or `UPSTASH_REDIS_REST_*`). |
| `prefix` | `string` | required | Namespaces the keys, e.g. `"playground:burst"`; stored as `web-agents:<prefix>`. |
| `limit` | `number` | required | Requests per window. |
| `window` | `` `${number} ${"s" \| "m" \| "h" \| "d"}` `` | required | Window length, e.g. `"1 m"`, `"1 d"`. |
| `failOpen` | `boolean` | required | What to do when Redis does not answer within 1 s or errors: let the request through (`true`, for per-IP limits: an outage must not take the chat down) or refuse it (`false`, for the global budget: an outage must not turn into an unbounded bill). |
| `createRatelimit` | `(config) => Pick<Ratelimit, "limit">` | `new Ratelimit(config)` | For tests: a stand-in for Upstash's `Ratelimit`. |

### `createMemoryLimiter(limit, windowMs, now?)`

| Name | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | required | Requests per window. |
| `windowMs` | `number` | required | Window length in ms. |
| `now` | `() => number` | `() => Date.now()` | The clock in epoch ms; pass one in tests. |

### `redisCredentials(env)`

| Name | Type | Default | Description |
|---|---|---|---|
| `env` | `Env` | required | An environment (`Record<string, string \| undefined>`) to read the Upstash REST URL and token from. |

### `Limiter`

What `createLimiter` and `createMemoryLimiter` return.

| Name | Type | Description |
|---|---|---|
| `limit` | `(key: string) => Promise<LimitResult>` | Counts one request for `key` and answers whether it may go ahead. Never rejects: a storage failure follows the limiter's fail-open or fail-closed policy. |

### `LimitResult`

What `limit(key)` resolves to.

| Name | Type | Description |
|---|---|---|
| `success` | `boolean` | The request may go ahead. |
| `reset` | `number` | When the window frees up, in epoch ms. |
| `remaining` | `number` | Requests left in the window. |
| `degraded` | `boolean \| undefined` | Refused because storage failed under fail-closed, not because the limit was reached. |

## Returns

`createLimiter` and `createMemoryLimiter` return a `Limiter`: `limit(key)` counts one request for `key` and resolves to a `LimitResult` (see the tables under Options). `limit` never rejects; a storage failure follows the limiter's fail-open or fail-closed policy.

`redisCredentials` returns `{ url, token }` from `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Vercel Marketplace), else `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, and `null` unless both a URL and a token are found.

## Notes

- Without Redis credentials, `createLimiter` logs a warning once ("Rate limiting is per-instance") and falls back to `createMemoryLimiter`. `failOpen` does not apply there.
- Upstash lets a timed-out request through. `createLimiter` keeps that only when `failOpen` is `true`. A thrown error (bad token, outage) follows the same policy and is logged.
- Failing open returns `{ success: true, reset: now, remaining: 0 }`. Failing closed returns `success: false`, `degraded: true` and a `reset` 60 s out.
- Limiters in one function instance share one Redis client per URL.
- `createMemoryLimiter` keeps at most 10,000 keys. The least recently used key goes first.

## See also

- [Deploy](../../more/deploy.md), where Upstash Redis is added
- [Guards](./guards.md): `rateLimitGuard` and `budgetGuard`
- [`createVercelChatRoute`](./create-vercel-chat-route.md)
