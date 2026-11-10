---
slug: reference/devtools
description: "Devtools for WebMCP pages: the tools that are live, a runner made from their schemas, and a timeline of every call."
---

# `@webmcp-agents/devtools`

Devtools for WebMCP pages. The panel shows which tools are live on the current screen. It runs them from a form
generated from their JSON Schema and records every call, whether it came from the panel or from a real agent.

The panel has three tabs:

- **Tools**: every registered tool, plus the catalog tools that are off on this page. Searchable, with badges (form or
  imperative, the tool's flags, confirm, off here, off screen) and **Locate** (scrolls to the tool's control and flashes
  it). Each tool built with `defineWebTool` / `useWebTool` also shows what the cursor will do (see
  [What the Tools tab shows](#what-the-tools-tab-shows)), so nobody has to guess.
- **Timeline**: newest first. It shows the arguments, the fields the cursor typed, the "waiting for you" state, the
  result or error, a duration bar, markers where you took over from the cursor, and **Re-run**.
- **Settings**: Spotlight and Yield-to-user switches wired to the agent cursor, dock (bottom or right) and size. All
  of these are saved in `localStorage`.

The panel renders in a shadow root, so no CSS leaks in or out. Its host carries `data-web-agents-ui`, so using the
panel never makes the agent cursor yield.

## Install

```sh
pnpm add -D @webmcp-agents/devtools
```

React and React DOM (>= 18) are peer dependencies, also for the vanilla host. `@tanstack/react-devtools` and
`@webmcp-agents/react` are optional peers.

## Entry points

| Import | What it has |
|---|---|
| `@webmcp-agents/devtools` | `installWebAgentsDevtools`, the store, the event-client bridge, `SchemaForm`, the copy-as-code helpers and other building blocks |
| `@webmcp-agents/devtools/react` | `<WebAgentsDevtools>`, `useDevtoolsStore`, `webAgentsDevtoolsPlugin` |

```ts
// Vanilla
import { installWebAgentsDevtools } from "@webmcp-agents/devtools";
if (import.meta.env.DEV) installWebAgentsDevtools({ visuals });
```

```tsx
// React, dev only: the condition guards the import() itself, so production bundles leave the devtools out
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@webmcp-agents/devtools/react").then((m) => ({ default: m.WebAgentsDevtools })))
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

## What the Tools tab shows

For a tool from `defineWebTool` or `useWebTool`, each row has up to three readouts, found the way the cursor finds them (core's [`inspectTools`](../core/inspect-tools.md)):

| Readout | Shows |
|---|---|
| **Control** | The control the cursor acts on and whose click confirms: `button · Add to cart`. `3 matches` when several share the name (an ordinary tool uses the first; a confirm-gated one found by name fails, so it is marked as a warning). `none: runs unseen` for a tool with no control. `none: confirmation fails` for a confirm-gated tool with none. `depends on the call` for a function `target`, which is resolved per call. Hover for how it was found: its `target`, a `toolname` marker, or its `title`. |
| **Fields** | Each parameter and the field it is typed into (`quantity → spinbutton · Quantity`), or `not typed` (`execute` still gets the value). |
| **Match** | The tool's `match` as written (`/orders`, `/cart, /checkout`, a RegExp) and whether it fits the current path. |

The flags show as badges: `read-only`, `destructive`, `repeatable`, `external`, `untrusted answer` (a `safeResponse: false` tool). `confirm` marks a tool that waits for the person's click. `off here` marks a catalog tool that is not registered right now (its `match` does not fit this path, or it is not available); its quick Run is disabled.

The tab follows the page: besides `toolchange` it refreshes on URL changes and on DOM changes (debounced), so a control that renders later is found without a tool change.

## Console helper

While the devtools are installed, `window.agent` lets you play the agent from the browser console:
`await agent.invoke("add_to_cart", { quantity: 2 })` and `await agent.list()`. `agent.run` is the same function under its earlier name. Calls made that way appear on the timeline. See [`createDevtoolsStore`](./create-devtools-store.md#windowagent).

## APIs

| API | Description |
|---|---|
| [`installWebAgentsDevtools`](./install-web-agents-devtools.md) | Mount the floating panel on any page. Includes `DevtoolsOptions`. |
| [`WebAgentsDevtools`](./web-agents-devtools.md) | The panel as a React component, wired to the provider's cursor. Includes `WebAgentsDevtoolsProps`, `useDevtoolsStore`. |
| [`webAgentsDevtoolsPlugin`](./web-agents-devtools-plugin.md) | The panel as a "Web Agents" tab of TanStack Devtools. Includes `WebAgentsDevtoolsPlugin`. |
| [`createDevtoolsStore`](./create-devtools-store.md) | The panel's state without a UI: tools, calls, settings, `runTool`, and the `window.agent` console helper. Includes `DevtoolsStore`, `DevtoolsState`, `DEFAULT_SETTINGS` and the store types. |
| [`webAgentsEventClient`](./event-client.md) | Post the store's state and agent events to TanStack Devtools' event bus. Includes `bridgeStoreToEventClient`, `WebAgentsEvents`. |
| [`SchemaForm`](./schema-form.md) | The JSON-Schema form the runner uses. Includes `SchemaFormProps`, `defaultValueFor`. |
| [`parseSchema`](./parse-schema.md) | Read a tool's `inputSchema` (a string in Chrome, an object in the polyfill). Includes `SchemaNode`. |
| [`toAgentInvokeCode`](./copy-as-code.md) | Snippets that repeat a call from the console or a test. Includes `toExecuteToolCode` and the deprecated `toAgentRunCode`. |
| [`installAgentConsole`](./install-agent-console.md) | Deprecated alias of `installWebAgentsDevtools`. Includes `AgentConsoleOptions`. |

## Limits

- Core events carry no call id, so an event belongs to the newest unfinished call of its tool. Two concurrent calls
  of the same tool can mix their fills and results.
- An agent's arguments aren't visible for declarative forms, only the fields the cursor typed. Re-run rebuilds
  arguments from those fills.
- Runs started from the panel can always be cancelled (through `executeTool`'s `signal`). A call an agent started
  can be cancelled only where `document.modelContext.cancelTool` exists (the polyfill). Native Chrome lets only the
  caller cancel, so the button is hidden there.
- "On screen" and the Control and Fields readouts are re-checked on `toolchange`, URL changes, DOM changes and when the Tools tab is shown. A function `target` is not resolved without a call's input (`depends on the call`).

## See also

- [Devtools](../../build/devtools.mdx), the page that teaches installing and using the panel
- [`@webmcp-agents/core`](../core/README.md) ([`inspectTools`](../core/inspect-tools.md), [`installAgentVisuals`](../core/install-agent-visuals.md))
- [`@webmcp-agents/react`](../react/README.md) ([`WebAgentsProvider`](../react/web-agents-provider.md))
