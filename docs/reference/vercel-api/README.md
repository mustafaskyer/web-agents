---
slug: vercel-api
---

# `@webmcp-agents/vercel-api`

The examples' `/api/chat` as Vercel web handlers. It puts `@webmcp-agents/chat`'s server handler behind an origin
check, per-IP rate limits and a global daily budget on model calls.

The package is private (`"private": true`). It is not published to npm. The example apps (`apps/playground`,
`apps/ecommerce`, `apps/flights`) use it as a workspace dependency.

```ts
// apps/<app>/api/chat.ts
import { createVercelChatRoute } from "@webmcp-agents/vercel-api";

export const { GET, POST, OPTIONS } = createVercelChatRoute({ app: "playground" });
```

Env is read when the route is created (at the function's cold start), never at import time.

## Deployment

Project settings, environment variables, Upstash Redis and the smoke test are in [../deploy.md](../deploy.md).

## How a request flows

1. `OPTIONS` answers 204. Other methods than `GET` and `POST` answer 405.
2. Cross-site browser requests are refused by the chat handler (403).
3. `guard`: `originGuard()` (403 `forbidden_origin`), then `rateLimitGuard` with a per-minute and a per-day limiter
   per IP (429 `rate_limited`). Only `POST` is checked.
4. `GET` answers `{ enabled, model }`.
5. The chat handler validates the body.
6. `beforeModel`: `budgetGuard` counts the call against the global daily budget (503 `unavailable`).
7. The model runs.

## API reference

| File | API |
|---|---|
| [create-vercel-chat-route.md](./create-vercel-chat-route.md) | `createVercelChatRoute`, `VercelChatRouteOptions`, env vars |
| [guards.md](./guards.md) | `Guard`, `composeGuards`, `originGuard`, `rateLimitGuard`, `budgetGuard`, `clientIp` |
| [limiter.md](./limiter.md) | `createLimiter`, `createMemoryLimiter`, `redisCredentials`, `Env`, `Limiter`, `LimiterOptions`, `LimitResult` |
