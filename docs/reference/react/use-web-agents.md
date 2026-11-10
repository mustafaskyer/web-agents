---
description: "Reads the nearest <WebAgentsProvider>: its tool registry, runtime cursor controls and pathname."
---

# `useWebAgents`

Reads the nearest [`<WebAgentsProvider>`](./web-agents-provider.md): its tool registry, runtime cursor controls and pathname. Reach for it when a component has to change the cursor (spotlight, yield) or list the catalog's tools. `useOptionalWebAgents` does the same but returns `null` outside a provider, for UI that also works without one (the devtools use it).

## Import

```ts
import { useOptionalWebAgents, useWebAgents } from "@webmcp-agents/react";
import type { WebAgentsContextValue, WebAgentsVisuals } from "@webmcp-agents/react";
```

## Example

A button that turns the spotlight on at runtime. It sits inside the provider; with `visuals={false}` there is no cursor and `visuals` is `null`.

<include meta='title="components/spotlight-button.tsx"'>/_examples/shared/reference/react/use-web-agents.tsx</include>

Where a component must also work without a provider, ask for the optional value:

```tsx
const ctx = useOptionalWebAgents();
ctx?.ensureVisuals(); // the provider installs its cursor lazily
```

## Options

Neither hook takes arguments: they return the nearest provider's value.

## Returns

A `WebAgentsContextValue`. `useWebAgents` throws `"useWebAgents must be used inside <WebAgentsProvider>"` outside a provider; `useOptionalWebAgents` returns `null` there.

| Name | Type | Description |
|---|---|---|
| `registry` | `ToolRegistry` | The registry behind the provider's [`createWebAgents`](../core/create-web-agents.md): its `tools` catalog, which ids are on. See [`createToolRegistry`](../core/create-tool-registry.md). |
| `visuals` | `WebAgentsVisuals \| null` | Runtime control of the cursor the provider installed: `setSpotlight(value)` and `setYieldToUser(value)`, each taking a boolean or its options object. `null` with `visuals={false}`. |
| `pathname` | `string` | The pathname tools are matched against: the earlier-form `pathname` prop, else the browser's. |
| `getContext()` | `() => unknown` | The latest earlier-form `context` prop, read when a tool runs. |
| `ensureVisuals()` | `() => void` | Install the cursor now if it is not yet. A tool must register after it to be animated. |

## Notes

- `setSpotlight` and `setYieldToUser` act on the cursor the provider holds at that moment. They do nothing while none is installed.
- The context value changes with the pathname. Code that only needs `getContext` or `ensureVisuals` (both stable) should depend on those, not on the whole value.
- The `spotlight` and `yieldToUser` values in the provider's `visuals` prop are also applied when they change, so a later prop change can overwrite a value set here.

## See also

- [Add the chat](../../build/add-the-chat.mdx) and [Devtools](../../build/devtools.mdx) read the provider this way
- [`WebAgentsProvider`](./web-agents-provider.md)
- [`installAgentVisuals`](../core/install-agent-visuals.md) (`AgentVisuals`, `SpotlightOptions`, `YieldOptions`)
- [`createToolRegistry`](../core/create-tool-registry.md)
- [`useEnabledTools`](./use-enabled-tools.md)
