---
description: "Registers a WebTool with document.modelContext and returns an unregister function."
---

# `registerWebTool`

Registers a [`WebTool`](./define-web-tool.md) with `document.modelContext` and returns an unregister function. Use it for a one-off registration outside a registry; UI code should usually go through [`createToolRegistry`](./create-tool-registry.md), `createWebAgents` or the React hooks, which register for you.

## Import

```ts
import { registerWebTool } from "@webmcp-agents/core";
```

## Example

Register a read-only tool, and release it later in a way that lets in-flight calls finish.

<include meta='title="register-get-cart.ts"'>/_examples/shared/reference/core/register-web-tool.ts</include>

## Options

`registerWebTool(source, options?)`. The first argument is the tool; the second is `ToModelContextToolOptions` plus `signal`.

| Name | Type | Default | Description |
|---|---|---|---|
| `source` | `WebTool \| (() => WebTool)` | required | The tool to register, or a function returning it. Pass a function for a tool whose definition changes while it stays registered (a component's tool closing over state): what WebMCP sees (id, title, description, schema, flags) is read once, now; `execute`, `target`, `fields` and `fill` are read from the function's tool on every call. The registry and `useWebTool` register this way. |
| `signal` | `AbortSignal` | not said | Aborting it unregisters the tool, like calling the returned function. Already aborted: nothing is registered. For tying a registration to a lifetime you already manage. |
| `context` | `() => unknown` | not said | Read on every call and passed to `execute` as the earlier form's `ctx.context`. New code closes over its own state instead. |
| `calls` | `CallTracker` | not said | Counts each call (confirmation wait included), so unregistering can wait for it. See [`createCallTracker`](./create-call-tracker.md). |

## Returns

`() => void`: the unregister function. It is idempotent.

## Notes

- The tool is adapted with [`toModelContextTool`](./to-model-context-tool.md): failures become `isError` results, cancellation rejects.
- While the polyfill that [`createWebAgents`](./create-web-agents.md) (or `<WebAgentsProvider>`) loads is on its way, the registration waits and happens once `document.modelContext` exists; unregistering before then cancels it. Without `document.modelContext` and with no polyfill loading, it warns once and returns a no-op, so the app still renders. On the server it returns a no-op without warning.
- Registering an id that is already registered through this function replaces that registration (Chrome rejects duplicate names). The replaced one's unregister becomes a no-op.
- Unregistering aborts the registration's signal and calls `unregisterTool` when the browser has it.
- Unregistering cancels the tool's in-flight calls in Chrome. From UI code, release through [`deferRelease`](./defer-release.md) with a [`CallTracker`](./create-call-tracker.md).

## See also

- [Define a tool](../../build/define-a-tool.mdx), where tools come from
- [`defineWebTool`](./define-web-tool.md), the definition it takes
- [`toModelContextTool`](./to-model-context-tool.md), the adapter underneath
- [`createToolRegistry`](./create-tool-registry.md), the ref-counted way to register a catalog
- [`isWebMCPAvailable`](./is-webmcp-available.md), whether registration can work
