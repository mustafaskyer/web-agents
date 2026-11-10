---
description: "Returns the catalog tool ids registered with WebMCP right now, sorted: the tools that are available and whose match fits this page, plus any a component enabled."
---

# `useEnabledTools`

Returns the catalog tool ids registered with WebMCP right now, sorted: the tools that are available and whose `match` fits this page, plus any a component enabled. Use it to show which tools the agent can see on the current page.

## Import

```ts
import { useEnabledTools } from "@webmcp-agents/react";
```

## Example

A badge that lists the tools on the current page. It re-renders when the set changes, for example after a navigation.

<include meta='title="components/tool-badge.tsx"'>/_examples/shared/reference/react/use-enabled-tools.tsx</include>

## Options

None. The hook takes no arguments.

## Returns

`readonly string[]`: the provider registry's `enabled()` snapshot. It is the same array until the set changes, and the component re-renders only when it does. During server rendering it is `[]`.

## Notes

- Needs a [`<WebAgentsProvider>`](./web-agents-provider.md): it throws outside one.
- Only catalog tools (the provider's `tools`) are listed. Tools registered with [`useWebTool`](./use-web-tool.md), declarative `<form toolname>` tools (the earlier form) and anything else on `document.modelContext` are not.
- An id counts as registered once the registry has registered it, and stays listed until its deferred release runs. After a route change a tool can stay in the list for a macrotask, or longer while one of its calls is in flight.
- Without WebMCP on the page, the registry still records the (no-op) registrations, so ids can be listed even though the agent sees nothing. Check `supported` from [`useWebTool`](./use-web-tool.md) or [`isWebMCPAvailable`](../core/is-webmcp-available.md) if that matters.

## See also

- [Where a tool is on](../../build/where-a-tool-is-on.mdx), the page that teaches `match` and `availableTools`
- [`WebAgentsProvider`](./web-agents-provider.md)
- [`useEnableTools` / `EnableTools`](./use-enable-tools.md)
- [`createToolRegistry`](../core/create-tool-registry.md)
