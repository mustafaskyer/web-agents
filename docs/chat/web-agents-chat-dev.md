# `webAgentsChatDev`

A Vite plugin that serves `/api/chat` from `vite dev`, so the chat widget works locally without a separate server. The
API key is read from the project's `.env` files on the server side.

```ts
import { webAgentsChatDev } from "@web-agents/chat/vite";
import type { WebAgentsChatDevOptions } from "@web-agents/chat/vite";
```

## Signature

```ts
function webAgentsChatDev(options?: WebAgentsChatDevOptions): Plugin;

interface WebAgentsChatDevOptions {
  path?: string;
  handler?: (req: Request) => Promise<Response>;
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | `"/api/chat"` | Mount path. Only that exact path (or with a trailing `/`) is served. |
| `handler` | `(req: Request) => Promise<Response>` | `createChatHandler({ env })` | The handler to serve. The default reads `ANTHROPIC_API_KEY` and `WEB_AGENTS_MODEL` from the project's `.env` files, falling back to `process.env`. |

## Returns

A Vite `Plugin` named `web-agents-chat-dev`, with `apply: "serve"`: it does nothing in builds.

## Example

```ts
// apps/ecommerce/vite.config.ts
import react from "@vitejs/plugin-react";
import { webAgentsChatDev } from "@web-agents/chat/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // /api/chat in dev; reads ANTHROPIC_API_KEY from .env.local on the server side only
  plugins: [react(), webAgentsChatDev()],
});
```

```bash
# .env.local
ANTHROPIC_API_KEY=…
```

## Notes

- Never use a `VITE_`-prefixed name for the key: Vite ships those to the browser.
- The env is loaded with `loadEnv(mode, envDir || root, "")` into a private object; `process.env` is not changed.
- Closing the browser request (Stop, a navigation) aborts the model call.
- A handler error is logged through Vite's logger and answered with `500` if headers weren't sent yet.
- `vite` is an optional peer dependency of `@web-agents/chat`.

## See also

- [`createChatHandler`](./create-chat-handler.md)
- [`createCloudAdapter`](./create-cloud-adapter.md)
