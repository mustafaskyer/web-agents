---
description: "Mounts the floating devtools panel (launcher bottom-right, Alt+Shift+A) on a page."
---

# `installWebAgentsDevtools`

Mounts the floating devtools panel (launcher bottom-right, `Alt+Shift+A`) on a page. Reach for it when you are not rendering the panel from React yourself (or want one line in a framework-neutral entry file). React still renders the panel, into its own root and shadow DOM.

## Import

```ts
import { installWebAgentsDevtools } from "@webmcp-agents/devtools";
import type { DevtoolsOptions } from "@webmcp-agents/devtools";
```

## Example

Install the agent cursor, then the panel, with the Settings switches wired to that cursor.

<include meta='title="src/devtools.ts"'>/_examples/shared/reference/devtools/install-web-agents-devtools.ts</include>

Guard the call with your framework's development flag so a production bundle leaves the devtools out.

## Options

`installWebAgentsDevtools(options?)` takes `DevtoolsOptions`, shared by [`<WebAgentsDevtools>`](./web-agents-devtools.md) and [`webAgentsDevtoolsPlugin`](./web-agents-devtools-plugin.md).

| Name | Type | Default | Description |
|---|---|---|---|
| `visuals` | `DevtoolsVisuals \| null` | `null` (React hosts: the nearest provider's cursor) | The agent cursor the Settings switches control (spotlight, yield to the user), for example the handle from `installAgentVisuals()`. Without one the switches are disabled. |
| `initialOpen` | `boolean` | `false` | Open the panel on load, unless the person closed it last time. |
| `initialSettings` | `Partial<DevtoolsSettings>` | not said | Starting settings, below what the person saved. Pass `spotlight` matching the visuals you installed, so the switch starts in sync. |
| `hotkey` | `string \| false` | `"Alt+Shift+A"` | Keyboard shortcut that toggles the panel. `false` for none. |
| `eventClient` | `boolean` | `true` | Post state and agent events to TanStack Devtools' event bus. A no-op unless TanStack devtools listen. |

`DevtoolsVisuals` is `Pick<AgentVisuals, "setSpotlight" | "setYieldToUser">`; the handle returned by core's `installAgentVisuals()` fits.

## Returns

A disposer `() => void`. It unmounts the panel, removes its host, destroys the store (restoring the previous `window.agent`) and stops the event-client bridge.

## Notes

- Installing twice logs a warning and returns the first disposer. Only one instance exists per page.
- Without `document` (SSR) it does nothing and returns a no-op disposer.
- Settings the person changed are saved in `localStorage` (key `"web-agents-devtools"`) and win over `initialOpen` and `initialSettings`. Saved `spotlight` and `yieldToUser` values are applied to `visuals` on the next task after install.
- `hotkey` matches letters and digits by physical key and is ignored while typing in the page's own fields. Pressing it on the page counts as user input, so the cursor yields for a moment.
- Calling it does not wire the panel to a [`<WebAgentsProvider>`](../react/web-agents-provider.md)'s cursor, which the provider keeps inside React: pass `visuals`, or render [`<WebAgentsDevtools>`](./web-agents-devtools.md) inside the provider.
- It sets `window.agent` (`invoke`, `run`, `list`); see [`createDevtoolsStore`](./create-devtools-store.md#windowagent).
- React and React DOM are peer dependencies even for this entry.

## See also

- [Devtools](../../build/devtools.mdx), the page that teaches it
- [`<WebAgentsDevtools>`](./web-agents-devtools.md), the React component
- [`webAgentsDevtoolsPlugin`](./web-agents-devtools-plugin.md), the TanStack Devtools tab
- [`createDevtoolsStore`](./create-devtools-store.md), `DevtoolsSettings`, `DevtoolsVisuals`
- [`webAgentsEventClient`](./event-client.md), what `eventClient` posts
- [`installAgentVisuals`](../core/install-agent-visuals.md)
