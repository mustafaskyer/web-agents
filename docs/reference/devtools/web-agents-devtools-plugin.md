---
description: "Puts the devtools panel in a \"Web Agents\" tab of TanStack Devtools."
---

# `webAgentsDevtoolsPlugin`

Puts the devtools panel in a "Web Agents" tab of TanStack Devtools. It is the same panel, embedded: no launcher, dock, resize handle or hotkey. Reach for it when your app already uses TanStack Devtools.

## Import

```tsx
import { webAgentsDevtoolsPlugin } from "@webmcp-agents/devtools/react";
import type { WebAgentsDevtoolsPlugin } from "@webmcp-agents/devtools/react";
```

## Example

Pass the plugin to `<TanStackDevtools>`, inside your `<WebAgentsProvider>` so Settings can drive the cursor. This needs `@tanstack/react-devtools` installed.

```tsx
import { TanStackDevtools } from "@tanstack/react-devtools";
import { webAgentsDevtoolsPlugin } from "@webmcp-agents/devtools/react";

<TanStackDevtools
  plugins={[webAgentsDevtoolsPlugin({ initialSettings: { spotlight: false } })]}
/>;
```

## Options

`webAgentsDevtoolsPlugin(options?)` takes [`DevtoolsOptions`](./install-web-agents-devtools.md#options) without `initialOpen` and `hotkey`: TanStack Devtools opens and closes its own tabs.

| Name | Type | Default | Description |
|---|---|---|---|
| `visuals` | `DevtoolsVisuals \| null` | the nearest `<WebAgentsProvider>`'s cursor, else `null` | What the Spotlight and Yield switches control. |
| `initialSettings` | `Partial<DevtoolsSettings>` | not said | Starting settings, below what the person saved. Pass `spotlight` matching your visuals. |
| `eventClient` | `boolean` | `true` | Bridge the store to TanStack Devtools' event bus. |

## Returns

A `WebAgentsDevtoolsPlugin`: `{ id: "web-agents", name: "Web Agents", render: <PluginPanel /> }`, structurally a `TanStackDevtoolsReactPlugin`. Pass it in `<TanStackDevtools plugins>`. The panel renders in a shadow root that fills the tab.

## Notes

- Render `<TanStackDevtools>` inside `<WebAgentsProvider>`, so Settings can drive the cursor.
- `@tanstack/react-devtools` (>= 0.10) is an optional peer dependency. Install it when you use the plugin.
- The store also posts `web-agents:state` and `web-agents:agent-event` on TanStack's event bus. See [`webAgentsEventClient`](./event-client.md).
- The embedded Settings tab hides the layout options (dock and size): the host owns the layout.

## See also

- [Devtools](../../build/devtools.mdx), the page that teaches it
- [`<WebAgentsDevtools>`](./web-agents-devtools.md), the floating panel and `useDevtoolsStore`
- [`installWebAgentsDevtools`](./install-web-agents-devtools.md), `DevtoolsOptions`
- [`webAgentsEventClient`](./event-client.md)
