# `useEnableTools`

Turns catalog tools on while the calling component is mounted: a promo row enables `remove_promo`, an open cart drawer enables its item tools. `EnableTools` is the component form, for JSX that would rather not call a hook.

```ts
import { EnableTools, useEnableTools } from "@web-agents/react";
```

## Signature

```ts
function useEnableTools(names: readonly string[]): void;

function EnableTools(props: { names: readonly string[] }): null;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `names` | `readonly string[]` | — | Catalog tool ids (from the provider's `tools`) to enable while mounted. |

`EnableTools` takes the same list as its `names` prop.

## Returns

Nothing. `EnableTools` renders `null`.

## Example

From `apps/ecommerce/src/components/CartDrawer.tsx`: the drawer's tools exist exactly while it is open.

```tsx
import { EnableTools } from "@web-agents/react";

<div role="dialog" aria-modal="true" className={styles.panel} inert={!cartOpen}>
  {cartOpen && <EnableTools names={drawerTools} />}
  …
</div>
```

The hook form of `<EnableTools names={["remove_promo"]} />` (which `apps/playground/src/App.tsx` renders in its promo row):

```tsx
function PromoRow() {
  useEnableTools(["remove_promo"]);
  return …;
}
```

## Notes

- Needs a [`<WebAgentsProvider>`](./web-agents-provider.md): it calls [`useWebAgents`](./use-web-agents.md), which throws outside one.
- Ref-counted with every other holder (`global`, `routes`, other components). A tool stays registered while anyone holds it.
- Release is deferred: a macrotask first (StrictMode's remount and route swaps cancel it), then until the tool's in-flight calls settle, plus 500 ms for the answer to reach the agent. So a tool whose own call unmounts the component still answers.
- The list is compared by value, so an inline array literal doesn't re-enable on every render.
- Unknown ids warn (outside `NODE_ENV=production`) with the catalog's ids instead of throwing. They stay held, and register if a later catalog update adds them.

## See also

- [`WebAgentsProvider`](./web-agents-provider.md)
- [`useEnabledTools`](./use-enabled-tools.md)
- [`useWebTool`](./use-web-tool.md) (a tool defined inside a component instead of the catalog)
- [`createToolRegistry`](../core/create-tool-registry.md)
- [`deferRelease`](../core/defer-release.md)
