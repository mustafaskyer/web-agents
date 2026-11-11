---
description: "Turns catalog tools on while the calling component is mounted: a promo row enables remove_promo, an open cart drawer enables its item tools."
---

# `useEnableTools`

Turns catalog tools on while the calling component is mounted: a promo row enables `remove_promo`, an open cart drawer enables its item tools. `EnableTools` is the component form, for JSX that would rather not call a hook.

This is the earlier way to scope a tool to a part of the page, for array catalogs (whose tools are off until something names them). With an object catalog every tool is already on where its `match` fits, and a tool that belongs to one component is better written with [`useWebTool`](./use-web-tool.md), which is on while the component is mounted.

## Import

```ts
import { EnableTools, useEnableTools } from "@webmcp-agents/react";
```

## Example

An array catalog, with `remove_promo` on while the promo row is on screen: the hook form in `PromoRow`, the component form in `PromoNotice`.

<include meta='title="components/cart.tsx"'>/_examples/shared/reference/react/use-enable-tools.tsx</include>

## Options

`useEnableTools(names)`.

| Name | Type | Default | Description |
|---|---|---|---|
| `names` | `readonly string[]` | required | Catalog tool ids (from the provider's `tools`) to enable while the component is mounted. |

`EnableTools` takes the same list as its `names` prop.

## Returns

Nothing. `EnableTools` renders `null`.

## Notes

- Needs a [`<WebAgentsProvider>`](./web-agents-provider.md): it calls [`useWebAgents`](./use-web-agents.md), which throws outside one.
- Ref-counted with every other holder (`global`, `routes`, other components, and the provider's own `match` and `availableTools`). A tool stays registered while anyone holds it.
- Release is deferred: a macrotask first (StrictMode's remount and route swaps cancel it), then until the tool's in-flight calls settle, plus 500 ms for the answer to reach the agent. So a tool whose own call unmounts the component still answers.
- The list is compared by value, so an inline array literal does not re-enable on every render.
- Unknown ids warn (outside `NODE_ENV=production`) with the catalog's ids instead of throwing. They stay held, and register if a later catalog update adds them.

## See also

- [Tools across your app](../../build/tools-across-your-app.mdx), the way new code scopes a tool
- [`WebAgentsProvider`](./web-agents-provider.md)
- [`useEnabledTools`](./use-enabled-tools.md)
- [`useWebTool`](./use-web-tool.md) (a tool defined inside a component: on while it is mounted)
- [`createToolRegistry`](../core/create-tool-registry.md)
- [`deferRelease`](../core/defer-release.md)
