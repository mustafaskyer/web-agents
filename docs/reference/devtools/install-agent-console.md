---
description: "Deprecated: the old agent console, an alias that installs the devtools panel, open on load."
---

# `installAgentConsole`

Deprecated. The old agent console, kept as an alias: it installs the devtools panel, open on load. Use [`installWebAgentsDevtools`](./install-web-agents-devtools.md) instead. The browser console helper it used to provide, [`window.agent`](./create-devtools-store.md#windowagent), is now set by every devtools store.

## Import

```ts
import { installAgentConsole } from "@webmcp-agents/devtools";
import type { AgentConsoleOptions } from "@webmcp-agents/devtools";
```

## Example

What a page that used it writes now:

```ts
import { installWebAgentsDevtools } from "@webmcp-agents/devtools";

// Was: installAgentConsole({ spotlight: { initial: false, set } })
const dispose = installWebAgentsDevtools({ initialOpen: true });
```

Then, in the browser console, `window.agent` plays the agent (`invoke` is the documented name, `run` the same function under its earlier name):

```js
await agent.invoke("add_to_cart", { quantity: 2 });
await agent.list();
```

## Options

`installAgentConsole(options?)` takes `AgentConsoleOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `spotlight` | `{ initial: boolean; set(on: boolean): void }` | not said | Drives the Spotlight switch. `initial` becomes `initialSettings.spotlight`; `set` is called when the switch changes. Without it the panel has no visuals and its switches are disabled. |

## Returns

The disposer from [`installWebAgentsDevtools`](./install-web-agents-devtools.md): `() => void`.

## Notes

- It calls `installWebAgentsDevtools({ visuals, initialOpen: true, initialSettings: { spotlight: spotlight?.initial } })`, so everything about that function applies, including one instance per page.
- Its `visuals.setYieldToUser` is a short-lived `installAgentVisuals({ yieldToUser })` handle that it destroys at once (installs are ref-counted, so the option applies to the page's existing visuals).
- `window.agent` is set by the store and restored to its previous value when the store is destroyed. Calls made through it appear on the timeline with origin `devtools`.

## See also

- [Devtools](../../build/devtools.mdx), the page that teaches the panel and the console helper
- [`installWebAgentsDevtools`](./install-web-agents-devtools.md), the replacement
- [`createDevtoolsStore`](./create-devtools-store.md): `window.agent`, `runTool`, `CallRecord`
- [`toAgentInvokeCode`](./copy-as-code.md): the snippet the runner copies
