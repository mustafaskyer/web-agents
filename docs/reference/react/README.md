---
slug: reference/react
description: "React bindings for WebMCP tools."
---

# `@webmcp-agents/react`

React bindings for WebMCP tools. Write a tool in a component with `useWebTool`, put the app's catalog in one provider, and get the agent cursor without any ordering rules. Nothing is added to your JSX for the cursor: it finds controls by role and accessible name.

```sh
pnpm add @webmcp-agents/react @webmcp-agents/core
```

React is a peer dependency (`react >= 18`).

```tsx
import { WebAgentsProvider } from "@webmcp-agents/react";
import "@webmcp-agents/core/cursor.css";

// Module level: the catalog of every tool the app has. Each says where it is on with `match`.
<WebAgentsProvider tools={tools}>
  <App />
</WebAgentsProvider>;
```

A tool that lives in a component is on while the component is mounted:

<include meta='title="components/clear-cart.tsx"'>/_examples/shared/components/clear-cart.tsx</include>

The page needs `document.modelContext`: a browser with WebMCP, or the [polyfill](../polyfill/README.md), which `<WebAgentsProvider>` loads by itself where the browser has none. In development the provider also installs the [devtools](../devtools/README.md) panel: `@webmcp-agents/devtools` is a dependency of this package, so there is nothing else to install.

## APIs

| API | Description |
|---|---|
| [`WebAgentsProvider`](./web-agents-provider.md) | The tool catalog (`tools`, `availableTools`), the agent cursor and, in development, the devtools, on `createWebAgents`. The earlier `global`, `routes`, `pathname` and `context` props are documented there too. Includes `WebAgentsProviderProps`, `ProviderDevtoolsOptions`. |
| [`useWebTool`](./use-web-tool.md) | Write a tool in a component: the definition, `execute`, an optional `target`. Returns `{ invoke, registered, supported }`. Includes `UseWebToolOptions`, `WebToolState`. |
| [`useWebAgents`](./use-web-agents.md) | The nearest provider's registry, cursor controls and pathname. Includes `useOptionalWebAgents`, `WebAgentsContextValue`, `WebAgentsVisuals`. |
| [`useEnabledTools`](./use-enabled-tools.md) | The catalog tool ids registered right now. |
| [`useAgentEvents`](./use-agent-events.md) | Every agent event while mounted. |
| [`usePathname`](./use-pathname.md) | The browser's pathname, followed without any router wiring. |
| [`useEnableTools`](./use-enable-tools.md) | Earlier form: enable catalog tools while a component is mounted. Includes the `EnableTools` component. |
| [`useToolAnswer`](./use-tool-answer.md) | Earlier form, for declarative forms: answer an agent's submit and keep the form until the agent has its answer. Includes `ToolAnswer` and the deprecated `useAnswerGrace`. |
| [JSX attributes](./jsx-attributes.md) | Earlier form: types for a declarative form's `toolname`, `tooldescription`, `toolautosubmit`, `toolparamdescription`. |

## Re-exported from core

The package re-exports the common path from `@webmcp-agents/core`, so one import is enough. They are documented there:

- [`defineWebTool`](../core/define-web-tool.md), with the types `WebTool`, `WebToolConfig`, `WebToolContext`, `WebToolCatalog`, `AvailableTools`, `ToolLocator`, `FieldTarget`, `Register`
- [`waitingForUser`](../core/waiting-for-user.md)
- [`WebToolError`](../core/web-tool-error.md)
- [`ToolErrorCode`](../core/tool-error.md) (type)

## StrictMode, routes and in-flight calls

Chrome cancels a running call when its tool's definition changes or the tool is unregistered. So nothing here unregisters synchronously: releases wait a macrotask (StrictMode's mount, unmount, mount, or a route swap that keeps a tool, never touches WebMCP), then until the tool's calls have settled, plus 500 ms for the answer to reach the agent. A tool that turns itself off still answers. The cursor is kept across StrictMode's remount the same way.

## See also

- [Installation](<../../(get-started)/installation/index.mdx>) and [Define a tool](../../build/define-a-tool.mdx), the path that teaches these APIs
- [`@webmcp-agents/core`](../core/README.md)
- [The polyfill](../polyfill/README.md)
- [`@webmcp-agents/tools`](../tools/README.md) (common tools for the catalog)
- Example apps: `apps/playground`, `apps/ecommerce`, `apps/flights`, `apps/nextjs`
