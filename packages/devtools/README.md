# @webmcp-agents/devtools

Devtools for WebMCP pages. See which tools are live on the current screen, run them from a form
generated from their JSON Schema, and watch every call: yours from the panel, or a real agent's.

- **Tools**: every registered tool (refreshed on `toolchange`), searchable, with badges (form or
  imperative, read-only, destructive, confirm, off screen) and **Locate** (scrolls to its `toolname`
  element and flashes it).
- **Runner**: a form for string, enum, date, number, integer, boolean, nested object and array
  fields, with a raw-JSON fallback for anything else and a **Form ⇄ JSON** toggle. **Run**
  (`⌘/Ctrl+Enter`), **Cancel** (polyfill only), and copy as `agent.run()` or `executeTool()` code.
- **Timeline**: newest first, the arguments, the fields the cursor typed, the "waiting for you"
  state, the result or error, a duration bar, markers where you took over from the cursor, and
  **Re-run**.
- **Settings**: Spotlight and Yield-to-user switches wired to the agent cursor, dock (bottom or
  right) and size, all persisted in `localStorage`.

The panel renders in a shadow root (no CSS leaks either way), sits above the spotlight, and its
host carries `data-web-agents-ui`, so using it never makes the agent cursor yield.

```sh
pnpm add -D @webmcp-agents/devtools
```

React and React DOM (≥ 18) are peer dependencies, also for the vanilla host.

## React

```tsx
import { lazy, Suspense } from "react";

// The condition guards the import() itself, so production bundles leave the devtools out.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@webmcp-agents/devtools/react").then((m) => ({ default: m.WebAgentsDevtools })))
  : () => null;

<WebAgentsProvider tools={catalog} visuals={{ spotlight: true }}>
  <App />
  <Suspense>
    <Devtools initialSettings={{ spotlight: true }} />
  </Suspense>
</WebAgentsProvider>;
```

Inside `<WebAgentsProvider>` the Settings switches drive the provider's cursor. Outside one, pass
`visuals` (needs `@webmcp-agents/react` only when you use the `/react` entry).

### TanStack Devtools

```tsx
import { TanStackDevtools } from "@tanstack/react-devtools";
import { webAgentsDevtoolsPlugin } from "@webmcp-agents/devtools/react";

<TanStackDevtools plugins={[webAgentsDevtoolsPlugin()]} />;
```

A "Web Agents" tab with the same panel, embedded (no launcher or dock). Render it inside your
`<WebAgentsProvider>`. The store also posts `web-agents:state` and `web-agents:agent-event` on
TanStack's event bus (`webAgentsEventClient`; a no-op outside development).

## Vanilla

```ts
import { installAgentVisuals } from "@webmcp-agents/core";
import { installWebAgentsDevtools } from "@webmcp-agents/devtools";

const visuals = installAgentVisuals({ spotlight: true });
if (import.meta.env.DEV) installWebAgentsDevtools({ visuals, initialSettings: { spotlight: true } });
```

## Options

| Option | Default | |
|---|---|---|
| `visuals` | provider's cursor (React), else `null` | What the Spotlight / Yield switches control. Without one they are disabled. |
| `initialOpen` | `false` | Open on load, unless the user closed it last time. |
| `initialSettings` | — | Starting settings below what the user saved. Pass `spotlight` matching your visuals, so the switch starts in sync. |
| `hotkey` | `"Alt+Shift+A"` | Toggles the panel. Letters match by physical key. `false` for none. Ignored while typing in the page's own fields. |
| `eventClient` | `true` | Bridge to TanStack's event bus. |

The browser console keeps `await agent.run("add_to_cart_mug-01", { qty: 3 })` and
`await agent.list()`. Calls made that way appear on the timeline too.

Building blocks are exported for other UIs: `createDevtoolsStore` (a `useSyncExternalStore`
store), `SchemaForm`, `defaultValueFor`, `parseSchema`, `toAgentRunCode`, `toExecuteToolCode`.
`installAgentConsole` remains as a deprecated alias.

## Limits

- Core events carry no call id, so an event belongs to the newest unfinished call of its tool.
  Two concurrent calls of the same tool can mix their fills and results.
- An agent's arguments aren't visible, only the fields the cursor typed; Re-run rebuilds
  arguments from those fills.
- Runs started from the panel can always be cancelled (through `executeTool`'s `signal`). A call
  an agent started can be cancelled only where `document.modelContext.cancelTool` exists (the
  polyfill): native Chrome lets only the caller cancel, so the button is hidden there.
- "On screen" is re-checked on `toolchange` and when the Tools tab is shown.
- Pressing the hotkey on the page is real keyboard input, so the cursor yields for a moment.
