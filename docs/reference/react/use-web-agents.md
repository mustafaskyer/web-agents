# `useWebAgents`

Reads the nearest [`<WebAgentsProvider>`](./web-agents-provider.md): its tool registry, cursor controls and pathname. `useOptionalWebAgents` does the same but returns `null` outside a provider, for UI that also works without one (the devtools use it).

```ts
import { useOptionalWebAgents, useWebAgents } from "@webmcp-agents/react";
import type { WebAgentsContextValue, WebAgentsVisuals } from "@webmcp-agents/react";
```

## Signature

```ts
function useWebAgents(): WebAgentsContextValue;
function useOptionalWebAgents(): WebAgentsContextValue | null;

interface WebAgentsContextValue {
  registry: ToolRegistry;
  visuals: WebAgentsVisuals | null;
  pathname: string;
  getContext(): unknown;
  ensureVisuals(): void;
}

type WebAgentsVisuals = Pick<AgentVisuals, "setSpotlight" | "setYieldToUser">;
```

## Parameters

—

## Returns

`WebAgentsContextValue`:

| Name | Type | Description |
|---|---|---|
| `registry` | `ToolRegistry` | The provider's tool registry (its `tools` catalog). See [`createToolRegistry`](../core/create-tool-registry.md). |
| `visuals` | `WebAgentsVisuals \| null` | Runtime control of the cursor the provider installed: `setSpotlight(value)` and `setYieldToUser(value)`. `null` with `visuals={false}`. |
| `pathname` | `string` | The pathname routes are matched against (the `pathname` prop, or the browser's). |
| `getContext()` | `() => unknown` | The latest `context` prop, read when a tool runs. |
| `ensureVisuals()` | `() => void` | Install the cursor now if it isn't yet. Imperative tools must register after it to be animated. |

`useWebAgents` throws `"useWebAgents must be used inside <WebAgentsProvider>"` outside a provider. `useOptionalWebAgents` returns `null` there.

## Example

Turn the spotlight on at runtime:

```tsx
import { useWebAgents } from "@webmcp-agents/react";

function SpotlightToggle() {
  const { visuals } = useWebAgents();
  if (!visuals) return null; // visuals={false}
  return <button onClick={() => visuals.setSpotlight(true)}>Spotlight</button>;
}
```

Optional provider, from `packages/devtools/src/react.tsx` (trimmed):

```tsx
const ctx = useOptionalWebAgents();
// The provider installs its cursor lazily; the saved settings need it now.
ctx?.ensureVisuals();
startDevtools({ ...options, visuals: options.visuals ?? ctx?.visuals ?? null });
```

## Notes

- `setSpotlight` and `setYieldToUser` act on the cursor the provider holds at that moment. They do nothing while none is installed.
- The context value changes with the pathname. Code that only needs `getContext` or `ensureVisuals` (both stable) should depend on those, not on the whole value.
- The `spotlight` and `yieldToUser` values in the provider's `visuals` prop are also applied when they change, so a later prop change can overwrite a value set here.

## See also

- [`WebAgentsProvider`](./web-agents-provider.md)
- [`installAgentVisuals`](../core/install-agent-visuals.md) (`AgentVisuals`, `SpotlightOptions`, `YieldOptions`)
- [`createToolRegistry`](../core/create-tool-registry.md)
- [`useEnabledTools`](./use-enabled-tools.md)
