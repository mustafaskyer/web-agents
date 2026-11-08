# `@web-agents/devtools`

Devtools for WebMCP pages. The panel shows which tools are live on the current screen. It runs them from a form
generated from their JSON Schema and records every call, whether it came from the panel or from a real agent.

The panel has three tabs:

- **Tools**: every registered tool (refreshed on `toolchange`), searchable, with badges (form or imperative,
  read-only, destructive, confirm, off screen) and **Locate** (scrolls to its `toolname` element and flashes it).
- **Timeline**: newest first. It shows the arguments, the fields the cursor typed, the "waiting for you" state, the
  result or error, a duration bar, markers where you took over from the cursor, and **Re-run**.
- **Settings**: Spotlight and Yield-to-user switches wired to the agent cursor, dock (bottom or right) and size. All
  of these are saved in `localStorage`.

The panel renders in a shadow root, so no CSS leaks in or out. Its host carries `data-web-agents-ui`, so using the
panel never makes the agent cursor yield.

## Install

```sh
pnpm add -D @web-agents/devtools
```

React and React DOM (>= 18) are peer dependencies, also for the vanilla host. `@tanstack/react-devtools` and
`@web-agents/react` are optional peers.

## Entry points

| Import | What it has |
|---|---|
| `@web-agents/devtools` | `installWebAgentsDevtools`, the store, the event-client bridge, `SchemaForm` and other building blocks |
| `@web-agents/devtools/react` | `<WebAgentsDevtools>`, `useDevtoolsStore`, `webAgentsDevtoolsPlugin` |

```ts
// Vanilla
import { installWebAgentsDevtools } from "@web-agents/devtools";
if (import.meta.env.DEV) installWebAgentsDevtools({ visuals });
```

```tsx
// React, dev only: the condition guards the import() itself, so production bundles leave the devtools out
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@web-agents/devtools/react").then((m) => ({ default: m.WebAgentsDevtools })))
  : () => null;
```

## The hotkey

`Alt+Shift+A` toggles the floating panel by default. Change it with the `hotkey` option, or pass `false` for none.

- Letters and digits match by physical key (`KeyA`, `Digit1`), so Option on a Mac doesn't change them.
- The hotkey is ignored while you type in the page's own `input`, `textarea`, `select` or contenteditable elements.
  Inside the panel it still works.
- `Escape` inside the floating panel closes it.
- Pressing the hotkey on the page is real keyboard input, so the agent cursor yields for a moment. Scripted checks
  should drive tools about 1 s later.
- The TanStack plugin tab has no hotkey.

## Console helper

While the devtools are installed, `window.agent` lets you play the agent from the browser console:
`await agent.run("add_to_cart_mug-01", { qty: 3 })` and `await agent.list()`. Calls made that way appear on the
timeline. See [install-agent-console.md](./install-agent-console.md).

## API reference

| File | API |
|---|---|
| [install-web-agents-devtools.md](./install-web-agents-devtools.md) | `installWebAgentsDevtools`, `DevtoolsOptions` |
| [web-agents-devtools.md](./web-agents-devtools.md) | `<WebAgentsDevtools>`, `WebAgentsDevtoolsProps`, `useDevtoolsStore` |
| [web-agents-devtools-plugin.md](./web-agents-devtools-plugin.md) | `webAgentsDevtoolsPlugin`, `WebAgentsDevtoolsPlugin` |
| [create-devtools-store.md](./create-devtools-store.md) | `createDevtoolsStore`, `DevtoolsStore`, `DevtoolsState`, `DEFAULT_SETTINGS` and the store types |
| [install-agent-console.md](./install-agent-console.md) | `installAgentConsole` (deprecated), `AgentConsoleOptions`, `window.agent` |
| [event-client.md](./event-client.md) | `webAgentsEventClient`, `bridgeStoreToEventClient`, `WebAgentsEvents` |
| [schema-form.md](./schema-form.md) | `SchemaForm`, `SchemaFormProps`, `defaultValueFor` |
| [parse-schema.md](./parse-schema.md) | `parseSchema`, `SchemaNode` |
| [copy-as-code.md](./copy-as-code.md) | `toAgentRunCode`, `toExecuteToolCode` |

## Limits

- Core events carry no call id, so an event belongs to the newest unfinished call of its tool. Two concurrent calls
  of the same tool can mix their fills and results.
- An agent's arguments aren't visible for declarative forms, only the fields the cursor typed. Re-run rebuilds
  arguments from those fills.
- Runs started from the panel can always be cancelled (through `executeTool`'s `signal`). A call an agent started
  can be cancelled only where `document.modelContext.cancelTool` exists (the polyfill). Native Chrome lets only the
  caller cancel, so the button is hidden there.
- "On screen" is re-checked on `toolchange` and when the Tools tab is shown.
