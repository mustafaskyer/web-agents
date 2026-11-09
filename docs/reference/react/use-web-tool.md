# `useWebTool`

Registers a tool that lives in a component and closes over its state, while the component is mounted and `enabled`. Calls always reach the latest render's `execute`, so new state never needs a re-registration.

```ts
import { useWebTool } from "@webmcp-agents/react";
import type { UseWebToolOptions, WebToolState } from "@webmcp-agents/react";
```

## Signature

```ts
function useWebTool(tool: WebTool, options?: UseWebToolOptions): WebToolState;

interface UseWebToolOptions {
  enabled?: boolean;
}

interface WebToolState {
  registered: boolean;
  supported: boolean;
}
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `tool` | `WebTool` | — | A tool from [`defineWebTool`](../core/define-web-tool.md). |
| `options.enabled` | `boolean` | `true` | Register only while true. |

## Returns

`WebToolState`:

| Name | Type | Description |
|---|---|---|
| `registered` | `boolean` | The tool is registered with WebMCP. False until the effect runs, while disabled, and on pages without WebMCP. |
| `supported` | `boolean` | The page has `document.modelContext` (native or polyfilled). False during server rendering. |

## Example

From `apps/playground/src/tools/ClearCartButton.tsx`. The tool is confirm-gated, and only visible to the agent while there is something to clear.

```tsx
import { defineWebTool, useWebTool } from "@webmcp-agents/react";
import { useMemo } from "react";

export function ClearCartButton() {
  const cart = useCart();
  const tool = useMemo(
    () =>
      defineWebTool({
        id: "clear_cart",
        description: "Remove every item from the cart. Use only when the user asks to empty it. The user confirms on the page.",
        annotations: { destructiveHint: true },
        requireConfirmation: true,
        execute: () => cart.clear(),
      }),
    [cart],
  );
  const { registered } = useWebTool(tool, { enabled: cart.items.length > 0 });

  return (
    <button type="button" toolname="clear_cart" onClick={() => cart.clear()} disabled={cart.items.length === 0}
      title={registered ? "Agent-callable" : undefined}>
      Clear cart
    </button>
  );
}
```

## Notes

- It re-registers only when what the agent sees changes: id, title, description, input schema, annotations, `requireConfirmation`, `target` (the [`webToolSignature`](../core/web-tool-signature.md)). A new definition replaces the old one at once, since Chrome would cancel its calls anyway.
- Disabling or unmounting releases it like the registry does: a macrotask later (StrictMode's remount or a quick re-enable cancels it), and only after in-flight calls settle, plus 500 ms for the answer to reach the agent. A tool that disables itself (`clear_cart` emptying the cart) still answers.
- The signature is computed during render, so a bad schema throws at the component, not inside an effect.
- Works without a provider. Inside a [`<WebAgentsProvider>`](./web-agents-provider.md) it installs the provider's cursor before registering (so the tool is animated) and passes the provider's `context` as `ctx.context`. Without one, nothing installs the cursor and `ctx.context` is `undefined`.
- Registering an id that is already registered replaces that registration (the newest wins). Don't give a `useWebTool` tool the same id as a catalog tool.
- Without WebMCP, registration warns once (`document.modelContext is unavailable`) and does nothing, so the app still renders.
- With `requireConfirmation`, a trusted click on the tool's element (`target`, default `[toolname="<id>"]`) runs the tool instead of the element's own `onClick`, so the action happens once. That includes a React Aria `Button`'s `onPress` and a `Link`'s navigation: the click React Aria re-fires is swallowed too. React Aria components drop unknown attributes, so put `toolname` on an element inside or around them.

## See also

- [`defineWebTool`](../core/define-web-tool.md)
- [`registerWebTool`](../core/register-web-tool.md)
- [`useEnableTools`](./use-enable-tools.md) (catalog tools)
- [`deferRelease`](../core/defer-release.md)
- [JSX attributes](./jsx-attributes.md) (`toolname`)
