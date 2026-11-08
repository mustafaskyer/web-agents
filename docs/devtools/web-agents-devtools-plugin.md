# `webAgentsDevtoolsPlugin`

Puts the devtools panel in a "Web Agents" tab of TanStack Devtools. It is the same panel, embedded: no launcher,
dock, resize handle or hotkey.

```tsx
import { webAgentsDevtoolsPlugin } from "@web-agents/devtools/react";
import type { WebAgentsDevtoolsPlugin } from "@web-agents/devtools/react";
```

## Signature

```ts
function webAgentsDevtoolsPlugin(
  options?: Omit<DevtoolsOptions, "initialOpen" | "hotkey">,
): WebAgentsDevtoolsPlugin;

/** A TanStack Devtools plugin (structurally a `TanStackDevtoolsReactPlugin`). */
interface WebAgentsDevtoolsPlugin {
  id: string;
  name: string;
  render: ReactElement;
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `visuals` | `DevtoolsVisuals \| null` | the nearest `<WebAgentsProvider>`'s cursor, else `null` | What the Spotlight and Yield switches control. |
| `initialSettings` | `Partial<DevtoolsSettings>` | — | Starting settings below what the user saved. Pass `spotlight` matching your visuals. |
| `eventClient` | `boolean` | `true` | Bridge to TanStack's event bus. |

`initialOpen` and `hotkey` are left out: TanStack Devtools opens and closes its own tabs.

## Returns

A plugin object: `{ id: "web-agents", name: "Web Agents", render: <PluginPanel /> }`. Pass it in
`<TanStackDevtools plugins>`. The panel renders in a shadow root that fills the tab.

## Example

From `apps/playground/src/Devtools.tsx` (`?tanstack` in the URL picks the TanStack tab):

```tsx
import { TanStackDevtools } from "@tanstack/react-devtools";
import { WebAgentsDevtools, webAgentsDevtoolsPlugin } from "@web-agents/devtools/react";

const TANSTACK = new URLSearchParams(location.search).has("tanstack");

export default function Devtools({ spotlight }: { spotlight: boolean }) {
  if (TANSTACK) return <TanStackDevtools plugins={[webAgentsDevtoolsPlugin({ initialSettings: { spotlight } })]} />;
  return <WebAgentsDevtools initialSettings={{ spotlight }} />;
}
```

## Notes

- Render `<TanStackDevtools>` inside `<WebAgentsProvider>`, so Settings can drive the cursor.
- `@tanstack/react-devtools` (>= 0.10) is an optional peer dependency. Install it when you use the plugin.
- The store also posts `web-agents:state` and `web-agents:agent-event` on TanStack's event bus. See
  [event-client.md](./event-client.md).
- The embedded Settings tab hides the layout options (dock and size): the host owns the layout.

## See also

- [web-agents-devtools.md](./web-agents-devtools.md): the floating panel and `useDevtoolsStore`
- [install-web-agents-devtools.md](./install-web-agents-devtools.md): `DevtoolsOptions`
- [event-client.md](./event-client.md)
