---
description: "Gives the page document.modelContext: nothing to do where the browser has WebMCP, elsewhere it loads the polyfill and installs it."
---

# `loadWebMCPPolyfill`

Gives the page `document.modelContext`: nothing to do where the browser has WebMCP, elsewhere it loads the polyfill and installs it. [`createWebAgents`](./create-web-agents.md) and [`<WebAgentsProvider>`](../react/web-agents-provider.md) call it for you (their `polyfill` option, default `"auto"`); call it yourself only on a page that registers tools without them.

## Import

```ts
import { loadWebMCPPolyfill } from "@webmcp-agents/core";
import type { PolyfillOption } from "@webmcp-agents/core";
```

## Example

A page that registers a tool by hand waits for `document.modelContext` first.

<include meta='title="tools.ts"'>/_examples/shared/reference/core/load-webmcp-polyfill.ts</include>

## Options

None: `loadWebMCPPolyfill()` takes no arguments.

### `PolyfillOption`

`"auto" | false`, the type of the `polyfill` option of `createWebAgents` and the `polyfill` prop of `<WebAgentsProvider>`. `"auto"` calls `loadWebMCPPolyfill` when the browser has no `document.modelContext`; `false` never does.

## Returns

`Promise<ModelContext | undefined>`:

- Where the browser has `document.modelContext`, it resolves at once to it. Nothing is downloaded.
- Elsewhere it loads the polyfill (a dynamic `import()` of `@webmcp-agents/core/polyfill`, a chunk of its own), installs it with [`installWebMCPPolyfill`](../polyfill/install-webmcp-polyfill.md), registers the tools that waited for it, and resolves to the new [`PolyfillModelContext`](../polyfill/polyfill-model-context.md).
- `undefined` on the server.
- It rejects when the chunk fails to load (offline, a stale deployment); the next call tries again.

## Notes

- **One load per page.** Every call while it loads, or after, gets the same promise.
- **Tools registered while it loads wait for it.** [`registerWebTool`](./register-web-tool.md), and so `useWebTool` and the registry, queue a registration made before `document.modelContext` exists and register it once the polyfill is installed, in the order it came. Unregistering before then cancels it.
- **Browsers with WebMCP never download it.** The polyfill is reached only through this dynamic import, so bundlers (Vite, Turbopack, webpack) put it in its own chunk. About 2.5 KB min+gz.
- **In production too.** `createWebAgents` and the provider load it for every visitor whose browser has no WebMCP, so the cursor, the tools and the chat work in Firefox and Safari. A site that wants native WebMCP only passes `polyfill: false` (`polyfill={false}`).
- The installed polyfill steps aside if the browser gained `document.modelContext` meanwhile.
- `@webmcp-agents/core/polyfill` (`installWebMCPPolyfill`, `PolyfillModelContext`) and the side-effect `@webmcp-agents/core/polyfill/auto` import it directly, without the wait; see [the polyfill reference](../polyfill/README.md).

## See also

- [Browsers without WebMCP](../../more/polyfill.mdx), the guide
- [`createWebAgents`](./create-web-agents.md) and [`<WebAgentsProvider>`](../react/web-agents-provider.md), which call it
- [`whenModelContext`](./when-model-context.md)
- [`installWebMCPPolyfill`](../polyfill/install-webmcp-polyfill.md)
- [Tool lifecycle](../../concepts/tool-lifecycle.mdx)
