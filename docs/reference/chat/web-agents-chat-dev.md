# `webAgentsChatDev`

A Vite plugin that serves `/api/chat` from `vite dev`, so the chat widget works locally without a separate server. The
API key is read from the project's `.env` files on the server side.

```ts
import { webAgentsChatDev } from "@webmcp-agents/chat/vite";
import type { WebAgentsChatDevOptions } from "@webmcp-agents/chat/vite";
```

## Signature

```ts
function webAgentsChatDev(options?: WebAgentsChatDevOptions): Plugin;

interface WebAgentsChatDevOptions {
  path?: string;
  handler?: (req: Request) => Promise<Response>;
  secretGuard?: boolean;
  agents?: readonly WebAgent[];
  envKeys?: (key: string) => boolean;
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | `"/api/chat"` | Mount path. Only that exact path (or with a trailing `/`) is served. |
| `handler` | `(req: Request) => Promise<Response>` | `createChatHandler({ env, agents })` | The handler to serve. The default reads the provider keys and `WEB_AGENTS_*` from the project's `.env` files, falling back to `process.env`. |
| `agents` | `readonly WebAgent[]` | — | The page's agents ([`defineWebAgent`](./define-web-agent.md)) for the default handler: the same list the page passes to `<AgentChat>`. |
| `envKeys` | `(key: string) => boolean` | `*_API_KEY`, `AI_GATEWAY_*`, `VERCEL_OIDC_TOKEN`, `WEB_AGENTS_*` | Which variables reach the default handler. |
| `secretGuard` | `boolean` | `true` | Refuse to start `vite dev` when a `VITE_*` variable is named like a secret (`*_API_KEY`, `*_SECRET`, `*_TOKEN`), since Vite inlines every `VITE_` variable into the browser bundle. The error names the variable. |

## Returns

A Vite `Plugin` named `web-agents-chat-dev`, with `apply: "serve"`: it does nothing in builds.

## Example

```ts
// apps/ecommerce/vite.config.ts
import react from "@vitejs/plugin-react";
import { webAgentsChatDev } from "@webmcp-agents/chat/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // /api/chat in dev; reads the provider key from .env.local on the server side only; knows the page's agents
  plugins: [react(), webAgentsChatDev({ agents: [shopper] })],
});
```

```bash
# .env.local
ANTHROPIC_API_KEY=…
```

## Notes

- Never use a `VITE_`-prefixed name for the key: Vite ships those to the browser. The plugin fails fast on `VITE_OPENAI_API_KEY`-style names (`secretGuard`); a public value that happens to end in `_TOKEN` can opt out with `secretGuard: false`.
- The env is loaded with `loadEnv(mode, envDir || root, "")` into a private object; `process.env` is not changed.
- Closing the browser request (Stop, a navigation) aborts the model call.
- A handler error is logged through Vite's logger and answered with `500` if headers weren't sent yet.
- `vite` is an optional peer dependency of `@webmcp-agents/chat`.

## See also

- [`createChatHandler`](./create-chat-handler.md)
- [`createCloudAdapter`](./create-cloud-adapter.md)
