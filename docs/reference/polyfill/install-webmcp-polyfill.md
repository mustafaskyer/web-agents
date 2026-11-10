---
description: "Installs a document.modelContext polyfill unless the browser already has one, and returns whichever ModelContext is active."
---

# `installWebMCPPolyfill`

Installs a `document.modelContext` polyfill unless the browser already has one, and returns whichever `ModelContext` is active. [`<WebAgentsProvider>`](../react/web-agents-provider.md) and [`createWebAgents`](../core/create-web-agents.md) call it for you, through [`loadWebMCPPolyfill`](../core/load-webmcp-polyfill.md); call it yourself only on a page that registers tools without them.

## Import

```ts
import { installWebMCPPolyfill } from "@webmcp-agents/core/polyfill";
```

## Example

Call it before any tool registers. Here it also lists the registered tools whenever they change.

<include meta='title="src/polyfill.ts"'>/_examples/shared/reference/polyfill/install-webmcp-polyfill.ts</include>

When you do not need the return value, import [`@webmcp-agents/core/polyfill/auto`](./auto.md) instead.

## Options

None. The function takes no arguments.

## Returns

`ModelContext | undefined`:

- The native `document.modelContext` when the browser has one. Nothing is installed.
- Otherwise a new [`PolyfillModelContext`](./polyfill-model-context.md), defined on `document` as `modelContext` (configurable).
- `undefined` on the server (no `document`).

When it installs, it also starts declarative `<form toolname>` tools (found on install and with a `MutationObserver` on `document.documentElement`, including `toolautosubmit` and the confirmation pause) and logs `[web-agents] document.modelContext polyfilled: this browser has no native WebMCP` once.

## Notes

- Safe to call more than once: later calls return the installed instance.
- It steps aside when the browser has the real API. In a WebMCP-enabled Chrome you get Chrome's behaviour, including its event order and its cancelling of calls whose tool changes.
- Installed by hand, it must come before tools register: outside `createWebAgents` and the provider, `registerWebTool` without `document.modelContext` warns once and registers nothing. Tools that `createWebAgents` or the provider manage wait for the polyfill instead.
- Imported statically, it is in your main bundle; `loadWebMCPPolyfill` keeps it in a chunk that only browsers without WebMCP download.
- The declarative-form observer is never disconnected.
- `@webmcp-agents/polyfill` (deprecated) re-exports it, so `import { installWebMCPPolyfill } from "@webmcp-agents/polyfill"` keeps working.

## See also

- [Browsers without WebMCP](../../more/polyfill.mdx)
- [`loadWebMCPPolyfill`](../core/load-webmcp-polyfill.md), what the provider calls
- [`PolyfillModelContext`](./polyfill-model-context.md)
- [`@webmcp-agents/core/polyfill/auto`](./auto.md)
- [`isWebMCPAvailable`](../core/is-webmcp-available.md)
- [`WebAgentsProvider`](../react/web-agents-provider.md)
