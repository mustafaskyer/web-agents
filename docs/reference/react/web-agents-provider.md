---
description: "Puts your app's tools on the page and installs the agent cursor: tools is everything the app has, availableTools what an agent may use right now, and each tool's own match says on which pages it is on."
---

# `WebAgentsProvider`

Puts your app's tools on the page and installs the agent cursor: `tools` is everything the app has, `availableTools` what an agent may use right now, and each tool's own `match` says on which pages it is on. Reach for it once, near the root of a React app. It is a thin wrapper over [`createWebAgents`](../core/create-web-agents.md); the library follows the browser's URL itself, and loads the WebMCP polyfill itself where the browser has none, so the same line works in Vite, TanStack Start, Next.js and Astro, with nothing wired to a router and nothing to load first.

## Import

```ts
import { WebAgentsProvider } from "@webmcp-agents/react";
import type { WebAgentsProviderProps } from "@webmcp-agents/react";
```

## Example

A catalog (see [`defineWebTool`](../core/define-web-tool.md) and [common tools](../tools/README.md)), narrowed by the person's state. The provider installs the cursor before the first tool registers, so every tool is animated without any ordering rule.

<include meta='title="components/providers.tsx"'>/_examples/shared/reference/react/web-agents-provider.tsx</include>

Without `availableTools`, every tool is available, each where its `match` fits:

```tsx
<WebAgentsProvider tools={tools}>
  <App />
</WebAgentsProvider>
```

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `tools` | `WebToolCatalog` | `{}` | Every tool the app has, as an object: `{ getCart, listOrders }`. All of them are on, each where its `match` fits, unless `availableTools` says otherwise. Define it at module level or memoise it: a new object re-checks every tool, and only tools whose definition changed re-register. Two tools with one id throw at startup, naming both keys. An array is the [earlier form](#earlier-form). |
| `availableTools` | `AvailableTools` | every tool of an object catalog | What an agent may use right now, decided by your own state: tools by reference (`tools.getCart`) or by their key in `tools`. A tool that leaves is released once its call in flight is answered. An inline array is fine: it is compared by the tools' ids. |
| `visuals` | `AgentVisualsOptions \| false` | `{}` | Options for [`installAgentVisuals`](../core/install-agent-visuals.md), read when the cursor installs. `spotlight` and `yieldToUser` also apply when they change. `false` installs nothing: tools still register, without animation, and [`useWebAgents`](./use-web-agents.md) gives `visuals: null`. |
| `polyfill` | `"auto" \| false` | `"auto"` | Where the browser has no `document.modelContext` (Firefox, Safari, Chrome without WebMCP), `"auto"` loads the [polyfill](../core/load-webmcp-polyfill.md), a chunk of its own that browsers with WebMCP never download. The children render meanwhile, and their tools register once it is there. In production too, so every visitor gets the tools and the chat. `false` never loads it: tools register only where the browser has WebMCP. Read once, on mount. |
| `children` | `ReactNode` | none | The app. |
| `global` | `readonly string[]` | `[]` | Earlier form: tool ids enabled on every page. |
| `routes` | `Readonly<Record<string, readonly string[]>>` | `{}` | Earlier form: tool ids per route pattern (`/orders`, `/product/:slug`, `/flights/*`, `*`). Every matching pattern contributes. Today a tool says this itself, with `match`. |
| `pathname` | `string` | the browser's URL | Earlier form: the path `routes` and the tools' `match` are tested against, when a router's idea of it should win. By default the library tracks the URL itself (see [`usePathname`](./use-pathname.md)). |
| `context` | `RegisteredContext` | none | Earlier form: app state handed to every catalog tool's `execute` as `ctx.context`, read when a tool runs, so it is the latest render's value. Typed through the `Register` interface. New code closes over its state, or reads its store, instead. |

### Earlier form

These props predate tools that carry their own `match` and close over their own state. They keep working for existing apps; new code does not need them. An **array** catalog keeps its earlier meaning too: its tools are off until `global`, `routes`, a mounted component ([`useEnableTools`](./use-enable-tools.md)) or `availableTools` turns them on.

```tsx
<WebAgentsProvider
  tools={catalog}
  global={["get_cart"]}
  routes={{ "/orders": ["list_orders"] }}
  context={cart}
>
  <App />
</WebAgentsProvider>
```

Route patterns use [`matchPath`](../core/match-path.md). Unknown ids in `global`, `routes` or `EnableTools` warn (outside `NODE_ENV=production`) with the catalog's ids instead of throwing, and register if a later `tools` update adds them.

## Returns

A context provider. Descendants read it with [`useWebAgents`](./use-web-agents.md).

## Notes

- Three scopes: **everywhere** (a catalog tool with no `match`), **per path** (a catalog tool with a `match`) and **per component** ([`useWebTool`](./use-web-tool.md), on while mounted).
- `match` turns a tool on as soon as the URL changes, which can be before the new route has rendered: a tool must not assume its page's state is there yet. See [`createWebAgents`](../core/create-web-agents.md#notes).
- Nothing is unregistered synchronously. Chrome cancels a running call when its tool's definition changes or the tool is unregistered, so releases wait a macrotask (StrictMode's mount, unmount, mount, or a route swap that keeps a tool, never touches WebMCP), then until the tool's calls have settled, plus 500 ms (`RESPONSE_GRACE_MS`) for the answer to reach the agent. A tool that turns itself off still answers.
- The cursor is kept across StrictMode's remount the same way: its teardown is deferred a macrotask, so tools registered in the first mount stay animated.
- A changed definition (id, title, description, schema, flags, `requireConfirmation`, a non-function `target`) re-registers at once. A changed `execute` does not: calls always go to the definition the catalog holds now.
- `visuals` options other than `spotlight` and `yieldToUser` are only read at install. Inline objects are fine for those two: they are compared by value.
- On the server it renders its children and does nothing else. In the browser it renders them at once too: there is nothing to wait for before mounting it, and no "ready" state to keep.
- Where the browser has no WebMCP it loads the polyfill when it mounts (unless `polyfill={false}`). The cursor installs and the tools register once `document.modelContext` exists, including those of [`useWebTool`](./use-web-tool.md) components that mounted meanwhile. With native WebMCP nothing is loaded.

## See also

- [Where a tool is on](../../build/where-a-tool-is-on.mdx), the page that teaches `tools`, `match` and `availableTools`
- [`createWebAgents`](../core/create-web-agents.md), the same without React
- [Browsers without WebMCP](../../more/polyfill.mdx), what `polyfill` loads
- [`useWebTool`](./use-web-tool.md), a tool that lives in a component
- [`useWebAgents`](./use-web-agents.md), read the provider
- [`defineWebTool`](../core/define-web-tool.md)
- [`installAgentVisuals`](../core/install-agent-visuals.md)
