---
slug: reference/polyfill
description: "The document.modelContext (WebMCP) polyfill in @webmcp-agents/core, including declarative <form toolname> tools; @webmcp-agents/polyfill is deprecated and re-exports it."
---

# The polyfill

A `document.modelContext` (WebMCP) polyfill for browsers without native support, including declarative `<form toolname>` tools. It ships in `@webmcp-agents/core` as `@webmcp-agents/core/polyfill`, and [`<WebAgentsProvider>`](../react/web-agents-provider.md) and [`createWebAgents`](../core/create-web-agents.md) load it themselves where the browser has no WebMCP (their `polyfill` option, default `"auto"`), as a chunk of its own that browsers with WebMCP never download. It steps aside when the browser has the real API.

Most apps never import it. A page that registers tools without the provider imports it directly:

```ts
import "@webmcp-agents/core/polyfill/auto"; // or:
import { installWebMCPPolyfill } from "@webmcp-agents/core/polyfill";
const modelContext = installWebMCPPolyfill();
```

## `@webmcp-agents/polyfill` is deprecated

The package re-exports these entries (`@webmcp-agents/polyfill` is `@webmcp-agents/core/polyfill`, `@webmcp-agents/polyfill/auto` is `@webmcp-agents/core/polyfill/auto`), so code written against it keeps working. To move on: uninstall it, and delete the `import("@webmcp-agents/polyfill/auto")` and any "ready" state that waited for it; the provider does both.

## APIs

| API | Description |
|---|---|
| [`@webmcp-agents/core/polyfill/auto`](./auto.md) | Side-effect entry that installs the polyfill on import, for a page without the provider. |
| [`installWebMCPPolyfill`](./install-webmcp-polyfill.md) | Install the polyfill unless the browser has WebMCP; returns the active `ModelContext`. |
| [`PolyfillModelContext`](./polyfill-model-context.md) | The installed `document.modelContext`: `registerTool`, `unregisterTool`, `getTools`, `executeTool` with `{ signal }`, the non-standard `cancelTool`, events, declarative forms and the confirmation pause. |
| [`loadWebMCPPolyfill`](../core/load-webmcp-polyfill.md) | From `@webmcp-agents/core`: load it only where the browser has no WebMCP, as the provider does. |

## What it covers

- `registerTool(tool, { signal })`, `unregisterTool(name)`, `getTools()`, `executeTool(nameOrTool, args, { signal })`. `executeTool` accepts both its own `(name, object)` and Chrome's `(tool, JSON string)` shapes.
- Events on `document.modelContext`: `toolchange`, `toolactivated`, `toolcancel` (the last two with `.toolName`).
- Declarative `<form toolname …>` tools: input schema from the controls, `toolautosubmit`, and the confirmation pause, mirrored as `data-tool-form-active` / `data-tool-submit-active`.
- `SubmitEvent.agentInvoked` and `respondWith(promise)`.
- Non-standard `cancelTool(name)`, so dev tooling can cancel a call it didn't start.

## Differences from Chrome

- Event order: the polyfill fires `toolactivated → fill → submit`, native Chrome `fill → submit → toolactivated`. `@webmcp-agents/core` handles both.
- No `:tool-form-active` / `:tool-submit-active` pseudo-classes: use the `data-tool-…` attributes (core's `cursor.css` styles both, in separate rules).
- Unregistering a tool doesn't cancel its running calls; in Chrome it does.

## See also

- [Browsers without WebMCP](../../more/polyfill.mdx) and [Installation](<../../(get-started)/installation/index.mdx>)
- [`@webmcp-agents/core`](../core/README.md) ([`loadWebMCPPolyfill`](../core/load-webmcp-polyfill.md), [WebMCP types](../core/webmcp-types.md), [`executeTool`](../core/execute-tool.md))
- [`@webmcp-agents/react`](../react/README.md) ([JSX attributes](../react/jsx-attributes.md), [`useToolAnswer`](../react/use-tool-answer.md))
