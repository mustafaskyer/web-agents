---
slug: reference/polyfill
---

# `@webmcp-agents/polyfill`

A `document.modelContext` (WebMCP) polyfill for development and browsers without native support, including declarative `<form toolname>` tools. It steps aside when the browser has the real API.

```sh
pnpm add @webmcp-agents/polyfill
```

`@webmcp-agents/core` is an optional peer dependency (types only).

```ts
import "@webmcp-agents/polyfill/auto"; // or:
import { installWebMCPPolyfill } from "@webmcp-agents/polyfill";
const modelContext = installWebMCPPolyfill();
```

## APIs

| File | Description |
|---|---|
| [`installWebMCPPolyfill`](./install-webmcp-polyfill.md) | Install the polyfill unless the browser has WebMCP; returns the active `ModelContext`. |
| [`PolyfillModelContext`](./polyfill-model-context.md) | The installed `document.modelContext`: `registerTool`, `unregisterTool`, `getTools`, `executeTool` with `{ signal }`, the non-standard `cancelTool`, events, declarative forms and the confirmation pause. |
| [`@webmcp-agents/polyfill/auto`](./auto.md) | Side-effect entry that installs the polyfill on import. |

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

- [`@webmcp-agents/core`](../core/README.md) ([WebMCP types](../core/webmcp-types.md), [`executeTool`](../core/execute-tool.md))
- [`@webmcp-agents/react`](../react/README.md) ([JSX attributes](../react/jsx-attributes.md), [`useToolAnswer`](../react/use-tool-answer.md))
