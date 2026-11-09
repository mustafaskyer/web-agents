# `useEnabledTools`

Returns the catalog tool ids registered with WebMCP right now, sorted. Use it to show which tools the agent can see on the current page.

```ts
import { useEnabledTools } from "@webmcp-agents/react";
```

## Signature

```ts
function useEnabledTools(): readonly string[];
```

## Parameters

—

## Returns

`readonly string[]`: the provider registry's `enabled()` snapshot. It is the same array until the set changes, and the component re-renders only when it does. During server rendering it is `[]`.

## Example

```tsx
import { useEnabledTools } from "@webmcp-agents/react";

function ToolBadge() {
  const ids = useEnabledTools();
  return <p>{ids.length ? `Agent tools: ${ids.join(", ")}` : "No agent tools on this page"}</p>;
}
```

## Notes

- Needs a [`<WebAgentsProvider>`](./web-agents-provider.md): it throws outside one.
- Only catalog tools (the provider's `tools`) are listed. Tools registered with [`useWebTool`](./use-web-tool.md), declarative `<form toolname>` tools and anything else on `document.modelContext` are not.
- An id counts as registered once the registry has registered it, and stays listed until its deferred release runs. After a route change, a tool can stay in the list for a macrotask, or longer while one of its calls is in flight.
- Without WebMCP on the page, the registry still records the (no-op) registrations, so ids can be listed even though the agent sees nothing. Check `supported` from [`useWebTool`](./use-web-tool.md) or [`isWebMCPAvailable`](../core/is-webmcp-available.md) if that matters.

## See also

- [`useEnableTools` / `EnableTools`](./use-enable-tools.md)
- [`WebAgentsProvider`](./web-agents-provider.md)
- [`createToolRegistry`](../core/create-tool-registry.md)
