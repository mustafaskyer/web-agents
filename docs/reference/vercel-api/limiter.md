# `createLimiter`

A sliding-window request counter for the public demos. It uses Upstash Redis over REST when its env is present, so
limits hold across serverless instances. Otherwise it counts in memory per instance, which keeps local dev and
unconfigured previews working.

```ts
import { createLimiter, createMemoryLimiter, redisCredentials } from "@webmcp-agents/vercel-api";
import type { Env, Limiter, LimiterOptions, LimitResult } from "@webmcp-agents/vercel-api";
```

## Signature

```ts
function createLimiter(opts: LimiterOptions): Limiter;
function createMemoryLimiter(limit: number, windowMs: number, now?: () => number): Limiter;
function redisCredentials(env: Env): { url: string; token: string } | null;

type Env = Record<string, string | undefined>;

interface Limiter {
  limit(key: string): Promise<LimitResult>;
}

interface LimitResult {
  success: boolean;
  reset: number;
  remaining: number;
  degraded?: boolean;
}
```

## Options

`LimiterOptions`, for `createLimiter`:

| Name | Type | Default | Description |
|---|---|---|---|
| `env` | `Env` | — | Where the Upstash credentials are read (`KV_REST_API_*` or `UPSTASH_REDIS_REST_*`). |
| `prefix` | `string` | — | Namespaces the keys, e.g. `"playground:burst"`. Stored as `web-agents:<prefix>`. |
| `limit` | `number` | — | Requests per window. |
| `window` | `` `${number} ${"s" \| "m" \| "h" \| "d"}` `` | — | Window length, e.g. `"1 m"`, `"1 d"`. |
| `failOpen` | `boolean` | — | When Redis doesn't answer within 1 s or errors: let the request through (`true`) or refuse it (`false`). |
| `createRatelimit` | `(config) => Pick<Ratelimit, "limit">` | `new Ratelimit(config)` | Tests: a stand-in for Upstash's `Ratelimit`. |

`createMemoryLimiter` parameters:

| Name | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | — | Requests per window. |
| `windowMs` | `number` | — | Window length in ms. |
| `now` | `() => number` | `() => Date.now()` | Clock in epoch ms. |

## Returns

- `createLimiter` and `createMemoryLimiter` return a `Limiter`. `limit(key)` never rejects.
- `LimitResult`: `success` (the request may go ahead), `reset` (when the window frees up, epoch ms), `remaining`, and
  `degraded` (refused because storage failed under fail-closed, not because the limit was reached).
- `redisCredentials` returns `{ url, token }` from `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Vercel Marketplace), else
  `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. It returns `null` unless both a URL and a token are found.

## Example

```ts
import { createLimiter } from "@webmcp-agents/vercel-api";

const perMinute = createLimiter({ env: process.env, prefix: "playground:minute", limit: 30, window: "1 m", failOpen: true });

const r = await perMinute.limit(ip);
if (!r.success) console.log(`retry in ${Math.ceil((r.reset - Date.now()) / 1000)} s`);
```

## Notes

- Without Redis credentials, `createLimiter` logs a warning once ("Rate limiting is per-instance") and falls back to
  `createMemoryLimiter`. `failOpen` doesn't apply there.
- Upstash lets a timed-out request through. `createLimiter` keeps that only when `failOpen` is `true`. A thrown error
  (bad token, outage) follows the same policy and is logged.
- Failing open returns `{ success: true, reset: now, remaining: 0 }`. Failing closed returns `success: false`,
  `degraded: true` and a `reset` 60 s out.
- Limiters in one function instance share one Redis client per URL.
- `createMemoryLimiter` keeps at most 10,000 keys. The least recently used key goes first.
- Use `failOpen: true` for per-IP limits (an outage must not take the chat down) and `false` for a global budget (an
  outage must not turn into an unbounded bill).

## See also

- [guards.md](./guards.md): `rateLimitGuard`, `budgetGuard`
- [create-vercel-chat-route.md](./create-vercel-chat-route.md)
- [Deploy to Vercel](../../guides/deploy.md): adding Upstash Redis
