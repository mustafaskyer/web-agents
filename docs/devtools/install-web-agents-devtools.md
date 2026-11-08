# `installWebAgentsDevtools`

Mounts the floating devtools panel (launcher bottom-right, `Alt+Shift+A`) on a page without a React app of its own.
React still renders the panel, into its own root and shadow DOM.

```ts
import { installWebAgentsDevtools } from "@web-agents/devtools";
import type { DevtoolsOptions } from "@web-agents/devtools";
```

## Signature

```ts
function installWebAgentsDevtools(options?: DevtoolsOptions): () => void;

interface DevtoolsOptions {
  visuals?: DevtoolsVisuals | null;
  initialOpen?: boolean;
  initialSettings?: Partial<DevtoolsSettings>;
  hotkey?: string | false;
  eventClient?: boolean;
}
```

## Options

`DevtoolsOptions` is shared by `installWebAgentsDevtools`, `<WebAgentsDevtools>` and `webAgentsDevtoolsPlugin`.

| Name | Type | Default | Description |
|---|---|---|---|
| `visuals` | `DevtoolsVisuals \| null` | `null` (React: the provider's cursor) | The agent cursor the Settings switches control (spotlight, yield to the user), e.g. the handle from `installAgentVisuals()`. Without one the switches are disabled. |
| `initialOpen` | `boolean` | `false` | Open the panel on load, unless the user closed it last time. |
| `initialSettings` | `Partial<DevtoolsSettings>` | — | Starting settings below what the user saved. Pass `spotlight` matching the visuals you installed, so the switch starts in sync. |
| `hotkey` | `string \| false` | `"Alt+Shift+A"` | Keyboard shortcut that toggles the panel. `false` for none. |
| `eventClient` | `boolean` | `true` | Post state and agent events to TanStack Devtools' event bus. A no-op unless TanStack devtools listen. |

`DevtoolsVisuals` is `Pick<AgentVisuals, "setSpotlight" | "setYieldToUser">`. The handle returned by core's
`installAgentVisuals()` fits.

## Returns

A disposer `() => void`. It unmounts the panel, removes its host, destroys the store (restoring the previous
`window.agent`) and stops the event-client bridge.

## Example

```ts
import { installAgentVisuals } from "@web-agents/core";
import { installWebAgentsDevtools } from "@web-agents/devtools";

const visuals = installAgentVisuals({ spotlight: true });
if (import.meta.env.DEV) installWebAgentsDevtools({ visuals, initialSettings: { spotlight: true } });
```

## Notes

- Installing twice logs a warning and returns the first disposer. Only one instance exists per page.
- Without `document` (SSR) it does nothing and returns a no-op disposer.
- Settings the user changed are saved in `localStorage` (key `"web-agents-devtools"`) and win over
  `initialOpen` and `initialSettings`. Saved `spotlight` and `yieldToUser` values are applied to `visuals` on the
  next task after install.
- `hotkey` matches letters and digits by physical key and is ignored while typing in the page's own fields. Pressing
  it on the page counts as user input, so the cursor yields for a moment.
- React and React DOM are peer dependencies even for this vanilla entry.

## See also

- [web-agents-devtools.md](./web-agents-devtools.md): the React component
- [web-agents-devtools-plugin.md](./web-agents-devtools-plugin.md): the TanStack Devtools tab
- [create-devtools-store.md](./create-devtools-store.md): `DevtoolsSettings`, `DevtoolsVisuals`
- [event-client.md](./event-client.md): what `eventClient` posts
