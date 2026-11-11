---
description: "A Vite plugin that serves /api/chat from vite dev, so the chat widget works locally without a separate server."
---

# `webAgentsChatDev`

A Vite plugin that serves `/api/chat` from `vite dev`, so the chat widget works locally without a separate server. Use it in development; in production `/api/chat` is a function of your host's (see [`createChatHandler`](./create-chat-handler.md)). The API key is read from the project's `.env` files on the server side.

## Import

```ts
import { webAgentsChatDev } from "@webmcp-agents/chat/vite";
import type { WebAgentsChatDevOptions } from "@webmcp-agents/chat/vite";
```

## Example

Add the plugin to the config you have, and the page's agents so the dev endpoint knows them by id.

```ts vite.config.ts
import { webAgentsChatDev } from "@webmcp-agents/chat/vite"; // [!code highlight]
import { agents } from "./src/agents"; // [!code highlight]

// In defineConfig({ … }):
plugins: [react(), webAgentsChatDev({ agents })], // [!code highlight]
```

Put the key in `.env.local`, unprefixed:

```bash .env.local
ANTHROPIC_API_KEY=…
```

## Options

`webAgentsChatDev(options?)` takes a `WebAgentsChatDevOptions`; every option is optional.

| Name | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | `"/api/chat"` | Where to mount the endpoint. Only that exact path (or with a trailing `/`) is served. |
| `handler` | `(req: Request) => Promise<Response>` | `createChatHandler({ env, agents, tools, session, requireAgent })` | The handler to serve. The default reads the provider keys and `WEB_AGENTS_*` from the project's `.env` files, falling back to `process.env`. Pass your own to serve the same handler as production. |
| `secretGuard` | `boolean` | `true` | Refuse to start `vite dev` when a `VITE_*` variable is named like a secret (`*_API_KEY`, `*_SECRET`, `*_TOKEN`): Vite inlines every `VITE_` variable into the browser bundle. The error names the variable. |
| `agents` | `readonly WebAgent[]` | not set | The page's agents ([`defineWebAgent`](./define-web-agent.md)) for the default handler: the same list the page passes to `<AgentChat>`. Without it, a request naming an agent is refused; with it, a request naming none is (`requireAgent`, as in production). |
| `tools` | `readonly (string \| WebTool)[]` | not set (all) | The tools the page may offer the model, for the default handler: see [`createChatHandler`](./create-chat-handler.md)'s `tools`. Pass the list production uses. |
| `session` | `false \| ChatSessionOptions` | `{}` (on) | Chat sessions for the default handler, so dev runs the production path. The secret is `WEB_AGENTS_SESSION_SECRET` from the `.env` files, else random per dev server. With `TURNSTILE_SECRET_KEY` in the `.env` files, a session needs a solved [Turnstile](./create-chat-handler.md#turnstile) challenge. See [Sessions](./create-chat-handler.md#sessions). |
| `envKeys` | `(key: string) => boolean` | `*_API_KEY`, `AI_GATEWAY_*`, `VERCEL_OIDC_TOKEN`, `WEB_AGENTS_*` | Which variables from the `.env` files (and `process.env`) reach the default handler. |

## Returns

A Vite `Plugin` named `web-agents-chat-dev`, with `apply: "serve"`: it does nothing in builds.

## Notes

- Never use a `VITE_`-prefixed name for the key: Vite ships those to the browser. The plugin fails fast on `VITE_OPENAI_API_KEY`-style names; a public value that happens to end in `_TOKEN` can opt out with `secretGuard: false`.
- The env is loaded with `loadEnv(mode, envDir || root, "")` into a private object; `process.env` is not changed.
- Closing the browser request (Stop, a navigation) aborts the model call.
- A handler error is logged through Vite's logger and answered with `500` if headers were not sent yet.
- `vite` is an optional peer dependency of `@webmcp-agents/chat`.
- In dev, `/api/chat` never goes through `api/chat.ts`: pass `agents` here as well as to `createChatHandler` in production.

## See also

- [Add the chat](../../build/add-the-chat.mdx), the page that teaches it
- [`createChatHandler`](./create-chat-handler.md)
- [`createCloudAdapter`](./create-cloud-adapter.md)
