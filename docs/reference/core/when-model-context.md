---
description: "Calls a function once the page has document.modelContext: right away when it has, else when the polyfill installs it."
---

# `whenModelContext`

Calls a function once the page has `document.modelContext`: right away when it has, else when the polyfill installs it. For UI that reads the page's tools and may start before the polyfill that the provider loads (the devtools and the chat use it).

## Import

```ts
import { whenModelContext } from "@webmcp-agents/core";
```

## Example

Count the page's tools once there is a `document.modelContext` to ask.

<include meta='title="tool-count.ts"'>/_examples/shared/reference/core/when-model-context.ts</include>

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `listener` | `(modelContext: ModelContext) => void` | required | Called once with `document.modelContext`: synchronously when the page already has it, else when [`loadWebMCPPolyfill`](./load-webmcp-polyfill.md) (which `createWebAgents` and `<WebAgentsProvider>` call) has installed the polyfill. |

## Returns

`() => void`: stop waiting. It does nothing once the listener has run.

## Notes

- Waiting costs nothing and loads nothing: it never starts the polyfill itself, so on a page that never loads it (no provider, `polyfill: false` in a browser without WebMCP) the listener is never called.
- Listeners run in the order they were added. `createWebAgents` (so the provider) adds its own when it starts, before any tool registers: by the time a listener added later runs, the cursor is installed and the catalog registered.
- A listener that throws is logged and does not stop the others.
- On the server it never calls and returns a no-op.

## See also

- [`loadWebMCPPolyfill`](./load-webmcp-polyfill.md)
- [`isWebMCPAvailable`](./is-webmcp-available.md), the same question without waiting
- [Browsers without WebMCP](../../more/polyfill.mdx)
