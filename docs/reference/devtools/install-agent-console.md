# `installAgentConsole`

Deprecated. The old agent console, kept as an alias: it installs the devtools panel, open on load. The browser console
helper it used to provide, `window.agent`, is now set by every devtools store.

```ts
import { installAgentConsole } from "@webmcp-agents/devtools";
import type { AgentConsoleOptions } from "@webmcp-agents/devtools";
```

## Signature

```ts
/** @deprecated */
function installAgentConsole(options?: AgentConsoleOptions): () => void;

/** @deprecated */
interface AgentConsoleOptions {
  spotlight?: { initial: boolean; set(on: boolean): void };
}

// Set by the devtools store
interface Window {
  agent?: {
    run(name: string, args?: Record<string, unknown>): Promise<ModelContextToolResult | undefined>;
    list(): Promise<ModelContextToolInfo[]>;
  };
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `spotlight` | `{ initial: boolean; set(on: boolean): void }` | — | Drives the Spotlight switch. `initial` becomes `initialSettings.spotlight`; `set` is called when it changes. Without it the panel has no visuals. |

## Returns

The disposer from `installWebAgentsDevtools`.

## `window.agent`

| Method | Returns | Description |
|---|---|---|
| `run(name, args?)` | `Promise<ModelContextToolResult \| undefined>` | Runs the tool through the store's `runTool` (cursor and all). Resolves with the call's result. |
| `list()` | `Promise<ModelContextToolInfo[]>` | `document.modelContext.getTools()`, or `[]` without WebMCP. |

## Example

```ts
// Preferred
import { installWebAgentsDevtools } from "@webmcp-agents/devtools";
installWebAgentsDevtools({ visuals, initialOpen: true });
```

In the browser console, with the devtools installed:

```js
await agent.run("add_to_cart_mug-01", { qty: 3 });
await agent.list();
```

## Notes

- Use `installWebAgentsDevtools` instead.
- `installAgentConsole` maps `setYieldToUser` to a short-lived `installAgentVisuals({ yieldToUser })` handle that it
  destroys at once (installs are ref-counted, so the option applies to the page's existing visuals).
- Calls made through `window.agent` appear on the timeline with origin `devtools`.
- `run` resolves with `undefined` when the call failed before producing a result (for example, an unknown tool).
  The error is on the timeline record.
- `window.agent` is restored to its previous value when the store is destroyed.

## See also

- [install-web-agents-devtools.md](./install-web-agents-devtools.md)
- [create-devtools-store.md](./create-devtools-store.md): `runTool`, `CallRecord`
- [copy-as-code.md](./copy-as-code.md): `toAgentRunCode`
