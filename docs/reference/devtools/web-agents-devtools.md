---
description: "The floating devtools panel as a React component (launcher bottom-right, Alt+Shift+A)."
---

# `WebAgentsDevtools`

The floating devtools panel as a React component (launcher bottom-right, `Alt+Shift+A`). Render it once inside a [`<WebAgentsProvider>`](../react/web-agents-provider.md) and its Settings switches drive the provider's agent cursor. `useDevtoolsStore` is the same wiring without the panel, for building your own.

## Import

```tsx
import { WebAgentsDevtools, useDevtoolsStore } from "@webmcp-agents/devtools/react";
import type { WebAgentsDevtoolsProps } from "@webmcp-agents/devtools/react";
```

## Example

The panel beside the app, inside the provider. In a real app render it in development only, with a lazy `import()` behind your framework's dev flag, so production bundles leave the devtools out.

<include meta='title="components/providers.tsx"'>/_examples/shared/reference/devtools/web-agents-devtools.tsx</include>

## Props

`WebAgentsDevtoolsProps` is [`DevtoolsOptions`](./install-web-agents-devtools.md#options). Props are read once, on mount.

| Name | Type | Default | Description |
|---|---|---|---|
| `visuals` | `DevtoolsVisuals \| null` | the nearest `<WebAgentsProvider>`'s cursor, else `null` | What the Spotlight and Yield switches control. Without one they are disabled. |
| `initialOpen` | `boolean` | `false` | Open on load, unless the person closed it last time. |
| `initialSettings` | `Partial<DevtoolsSettings>` | not said | Starting settings, below what the person saved. Pass `spotlight` matching your visuals so the switch starts in sync. |
| `hotkey` | `string \| false` | `"Alt+Shift+A"` | Keyboard shortcut that toggles the panel. `false` for none. This is the one prop that applies when it changes. |
| `eventClient` | `boolean` | `true` | Bridge the store to TanStack Devtools' event bus. |

## Returns

`WebAgentsDevtools` renders the panel into a shadow root on a host appended to `document.body`. It renders `null` until its store exists (after the first effect).

`useDevtoolsStore(options?)` returns the [`DevtoolsStore`](./create-devtools-store.md) for a React host, or `null` on the first render. It takes the same options; the store is created on mount and destroyed on unmount. Use it to build your own panel on the store.

## Notes

- Render it once, inside your provider. Outside a provider, pass `visuals`. `@webmcp-agents/react` is needed only for this `/react` entry.
- Inside a provider it calls the provider's `ensureVisuals()` on mount, because the provider installs its cursor lazily and saved Settings need it.
- Destruction waits a macrotask. StrictMode's remount, or any quick remount, keeps the same store and its timeline.
- Options other than `hotkey` are read once: changing `visuals` or `initialSettings` later has no effect.

## See also

- [Devtools](../../build/devtools.mdx), the page that teaches it
- [`installWebAgentsDevtools`](./install-web-agents-devtools.md), the install without React, and `DevtoolsOptions`
- [`webAgentsDevtoolsPlugin`](./web-agents-devtools-plugin.md), the same panel as a TanStack tab
- [`createDevtoolsStore`](./create-devtools-store.md), the store `useDevtoolsStore` returns
- [`useWebAgents`](../react/use-web-agents.md)
