---
slug: reference/react
---

# `@webmcp-agents/react`

React bindings for WebMCP tools. Say once which tools the agent may see, turn them on globally, per route or per mounted component, and get the agent cursor without any ordering rules.

```sh
pnpm add @webmcp-agents/react @webmcp-agents/core
```

React is a peer dependency (`react >= 18`).

```tsx
import { defineWebTool, EnableTools, useWebTool, WebAgentsProvider } from "@webmcp-agents/react";
import "@webmcp-agents/core/cursor.css";

// Module level (or memoised): the catalog of every tool the app may expose.
const catalog = [getCart, listOrders, removePromo];

<WebAgentsProvider
  tools={catalog}
  global={["get_cart"]}                       // always on
  routes={{ "/orders": ["list_orders"] }}     // on while the pathname matches
  context={cart}                              // reaches execute as ctx.context
  visuals={{ spotlight: true }}               // AgentVisualsOptions, or false
>
  <App />
</WebAgentsProvider>

// In a component: on while it is mounted.
<EnableTools names={["remove_promo"]} />      // or useEnableTools(["remove_promo"])
```

The page needs `document.modelContext`: a WebMCP-enabled Chrome, or [`@webmcp-agents/polyfill`](../polyfill/README.md) in development.

## APIs

| File | Description |
|---|---|
| [`WebAgentsProvider`](./web-agents-provider.md) | The tool catalog, global and route-scoped tools, `ctx.context`, and the agent cursor. Includes `WebAgentsProviderProps`. |
| [`useWebAgents`](./use-web-agents.md) | The nearest provider's registry, cursor controls and pathname. Includes `useOptionalWebAgents`, `WebAgentsContextValue`, `WebAgentsVisuals`. |
| [`useEnableTools`](./use-enable-tools.md) | Enable catalog tools while a component is mounted. Includes the `EnableTools` component. |
| [`useEnabledTools`](./use-enabled-tools.md) | The catalog tool ids registered right now. |
| [`useWebTool`](./use-web-tool.md) | Register a tool that lives in a component and closes over its state. Includes `UseWebToolOptions`, `WebToolState`. |
| [`useToolAnswer`](./use-tool-answer.md) | Answer a declarative form's agent submit and keep the form until the agent has its answer. Includes `ToolAnswer` and the deprecated `useAnswerGrace`. |
| [`useAgentEvents`](./use-agent-events.md) | Every agent event while mounted. |
| [`usePathname`](./use-pathname.md) | The browser's pathname, as the provider tracks it. |
| [JSX attributes](./jsx-attributes.md) | Types for `toolname`, `tooldescription`, `toolautosubmit`, `toolparamdescription`. |

## Re-exported from core

The package re-exports the common path from `@webmcp-agents/core`, so one import is enough. They are documented there:

- [`defineWebTool`](../core/define-web-tool.md), with the types `WebTool`, `WebToolConfig`, `WebToolContext`, `Register`
- [`waitingForUser`](../core/waiting-for-user.md)
- [`WebToolError`](../core/web-tool-error.md)
- [`ToolErrorCode`](../core/tool-error.md) (type)

## StrictMode, routes and in-flight calls

Chrome cancels a running call when its tool's definition changes or the tool is unregistered. So nothing here unregisters synchronously: releases wait a macrotask (StrictMode's mount, unmount, mount, or a route swap that keeps a tool, never touches WebMCP), then until the tool's calls have settled, plus 500 ms for the answer to reach the agent. A tool that turns itself off still answers. The cursor is kept across StrictMode's remount the same way.

## See also

- [`@webmcp-agents/core`](../core/README.md)
- [`@webmcp-agents/polyfill`](../polyfill/README.md)
- Example apps: `apps/playground`, `apps/ecommerce`, `apps/flights`
