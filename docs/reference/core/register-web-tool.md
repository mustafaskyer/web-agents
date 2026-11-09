# `registerWebTool`

Registers a [`WebTool`](./define-web-tool.md) with `document.modelContext` and returns an unregister function. Use it for a one-off registration outside a registry; UI code should usually go through [`createToolRegistry`](./create-tool-registry.md) or the React hooks.

```ts
import { registerWebTool } from "@webmcp-agents/core";
```

## Signature

```ts
function registerWebTool(
  tool: WebTool,
  options?: ToModelContextToolOptions & { signal?: AbortSignal },
): () => void;
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `tool` | `WebTool` | — | The tool to register. |
| `signal` | `AbortSignal` | — | Aborting it unregisters the tool, like calling the returned function. Already aborted: nothing is registered. |
| `context` | `() => unknown` | — | Read on every call and passed to `execute` as `ctx.context`. |
| `calls` | `CallTracker` | — | Counts each call (confirmation wait included), so unregistering can wait for it. See [`createCallTracker`](./create-call-tracker.md). |

## Returns

An unregister function. It is idempotent.

## Example

```ts
import { createCallTracker, defineWebTool, deferRelease, registerWebTool } from "@webmcp-agents/core";

const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description: "Read the cart without opening it: lines, promo code and totals.",
  annotations: { readOnlyHint: true },
  execute: (_input, ctx) => ctx.context!.cart.describe(),
});

const calls = createCallTracker();
const off = registerWebTool(getCart, { context: () => storeContext, calls });

// On teardown from UI code: release later, so in-flight calls finish first.
function dispose() {
  deferRelease(off, { isBusy: calls.busy });
}
```

## Notes

- The tool is adapted with [`toModelContextTool`](./to-model-context-tool.md): failures become `isError` results, cancellation rejects.
- Without `document.modelContext` it warns once (suggesting `@webmcp-agents/polyfill/auto` in dev or a WebMCP-enabled Chrome) and returns a no-op, so the app still renders. On the server it returns a no-op without warning.
- Registering an id that is already registered through this function replaces that registration. The replaced one's unregister becomes a no-op.
- Unregistering aborts the registration's signal and calls `unregisterTool` when the browser has it.
- Unregistering cancels the tool's in-flight calls in Chrome. From UI code, release through [`deferRelease`](./defer-release.md) with a [`CallTracker`](./create-call-tracker.md).

## See also

- [`defineWebTool`](./define-web-tool.md)
- [`toModelContextTool`](./to-model-context-tool.md)
- [`createToolRegistry`](./create-tool-registry.md)
- [`isWebMCPAvailable`](./is-webmcp-available.md)
