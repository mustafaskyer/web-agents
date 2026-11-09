# `WebAgentsDevtools`

The floating devtools panel as a React component (launcher bottom-right, `Alt+Shift+A`). Inside a
`<WebAgentsProvider>` its Settings switches drive the provider's agent cursor.

```tsx
import { WebAgentsDevtools, useDevtoolsStore } from "@webmcp-agents/devtools/react";
import type { WebAgentsDevtoolsProps } from "@webmcp-agents/devtools/react";
```

## Signature

```ts
function WebAgentsDevtools(props: WebAgentsDevtoolsProps): JSX.Element | null;

interface WebAgentsDevtoolsProps extends DevtoolsOptions {}

function useDevtoolsStore(options?: DevtoolsOptions): DevtoolsStore | null;
```

## Props

`WebAgentsDevtoolsProps` is `DevtoolsOptions`. Props are read once, on mount.

| Name | Type | Default | Description |
|---|---|---|---|
| `visuals` | `DevtoolsVisuals \| null` | the nearest `<WebAgentsProvider>`'s cursor, else `null` | What the Spotlight and Yield switches control. Without one they are disabled. |
| `initialOpen` | `boolean` | `false` | Open on load, unless the user closed it last time. |
| `initialSettings` | `Partial<DevtoolsSettings>` | — | Starting settings below what the user saved. Pass `spotlight` matching your visuals. |
| `hotkey` | `string \| false` | `"Alt+Shift+A"` | Toggles the panel. `false` for none. |
| `eventClient` | `boolean` | `true` | Bridge to TanStack's event bus. |

## Returns

`WebAgentsDevtools` renders the panel into a shadow root on a host appended to `document.body`. It renders `null`
until its store exists (after the first effect).

`useDevtoolsStore` returns the `DevtoolsStore` for a React host, or `null` on the first render. It takes the same
options. The store is created on mount and destroyed on unmount. Use it to build your own panel on top of the store.

## Example

From `apps/ecommerce/src/Root.tsx`:

```tsx
import { lazy, Suspense } from "react";

// Dev only: the condition guards the import() itself, so the production bundle has no devtools.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@webmcp-agents/devtools/react").then((m) => ({ default: m.WebAgentsDevtools })))
  : () => null;

<WebAgentsProvider tools={catalog} visuals={{ spotlight: false }}>
  <App />
  <Suspense>
    <Devtools initialSettings={{ spotlight: false }} />
  </Suspense>
</WebAgentsProvider>;
```

## Notes

- Render it once, inside your provider. Outside a provider, pass `visuals`. `@webmcp-agents/react` is needed only for
  the `/react` entry.
- Inside a provider it calls the provider's `ensureVisuals()` on mount, because the provider installs its cursor
  lazily and saved Settings need it.
- Destruction waits a macrotask. StrictMode's remount, or any quick remount, keeps the same store and its timeline.
- Options other than `hotkey` are read once. Changing `visuals` or `initialSettings` later has no effect.

## See also

- [install-web-agents-devtools.md](./install-web-agents-devtools.md): the vanilla install and `DevtoolsOptions`
- [web-agents-devtools-plugin.md](./web-agents-devtools-plugin.md): the same panel as a TanStack tab
- [create-devtools-store.md](./create-devtools-store.md): the store `useDevtoolsStore` returns
