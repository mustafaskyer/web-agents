---
description: "The floating devtools panel as a React component (launcher bottom-right, Alt+Shift+A)."
---

# `WebAgentsDevtools`

The floating devtools panel as a React component (launcher bottom-right, `Alt+Shift+A`), for placing it yourself. [`<WebAgentsProvider>`](../react/web-agents-provider.md) already installs the panel in development; render this inside a provider with `devtools={false}` to choose where and when it shows (in production too), and its Settings switches drive the provider's agent cursor. `useDevtoolsStore` is the same wiring without the panel, for building your own.

## Import

```tsx
import { WebAgentsDevtools, useDevtoolsStore } from "@webmcp-agents/devtools/react";
import type { WebAgentsDevtoolsProps } from "@webmcp-agents/devtools/react";
```

## Example

The panel beside the app, inside a provider whose own panel is off. Install `@webmcp-agents/devtools` for this entry. To keep it out of production, render it behind your framework's dev flag with a lazy `import()`.

<include meta='title="components/providers.tsx"'>/_examples/shared/reference/devtools/web-agents-devtools.tsx</include>

## Props

`WebAgentsDevtoolsProps` is [`DevtoolsOptions`](./install-web-agents-devtools.md#options). Props are read once, on mount.

| Name | Type | Default | Description |
|---|---|---|---|
| `visuals` | `DevtoolsVisuals \| null` | the started `<WebAgentsProvider>`'s cursor ([`currentAgentVisuals()`](../core/current-agent-visuals.md)), else `null` | What the Spotlight and Yield switches control. Without one they are disabled. |
| `initialOpen` | `boolean` | `false` | Open on load, unless the person closed it last time. |
| `initialSettings` | `Partial<DevtoolsSettings>` | not said | Starting settings, below what the person saved. Pass `spotlight` matching your visuals so the switch starts in sync. |
| `hotkey` | `string \| false` | `"Alt+Shift+A"` | Keyboard shortcut that toggles the panel. `false` for none. This is the one prop that applies when it changes. |
| `eventClient` | `boolean` | `true` | Bridge the store to TanStack Devtools' event bus. |

## Returns

`WebAgentsDevtools` renders the panel into a shadow root on a host appended to `document.body`. It renders `null` until its store exists (after the first effect).

`useDevtoolsStore(options?)` returns the [`DevtoolsStore`](./create-devtools-store.md) for a React host, or `null` on the first render. It takes the same options; the store is created on mount and destroyed on unmount. Use it to build your own panel on the store.

## Notes

- Render it once, inside a provider with `devtools={false}`; with the provider's own panel on as well, the page has two. Outside a provider, pass `visuals`.
- It finds the cursor through core's [`currentAgentVisuals()`](../core/current-agent-visuals.md), read on mount: the provider has started by then (its layout effect runs before this component's effect). So this entry needs nothing from `@webmcp-agents/react`, which depends on this package. A Settings change made before the cursor installs (the polyfill still loading) becomes the cursor's starting option.
- Destruction waits a macrotask. StrictMode's remount, or any quick remount, keeps the same store and its timeline.
- Options other than `hotkey` are read once: changing `visuals` or `initialSettings` later has no effect.

## See also

- [Devtools](../../build/devtools.mdx), the page that teaches it
- [`installWebAgentsDevtools`](./install-web-agents-devtools.md), the install without React, and `DevtoolsOptions`
- [`webAgentsDevtoolsPlugin`](./web-agents-devtools-plugin.md), the same panel as a TanStack tab
- [`createDevtoolsStore`](./create-devtools-store.md), the store `useDevtoolsStore` returns
- [`useWebAgents`](../react/use-web-agents.md)
