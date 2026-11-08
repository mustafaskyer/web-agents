# `installAgentVisuals`

Installs the visual layer: a ghost cursor, a focus ring, an optional spotlight and a yield-to-user watcher, all driven by WebMCP lifecycle events. Call it once, before tools register, so the page shows what the agent does without the tools knowing.

```ts
import { installAgentVisuals } from "@web-agents/core";
import "@web-agents/core/cursor.css";
```

## Signature

```ts
function installAgentVisuals(options?: AgentVisualsOptions): AgentVisuals;

interface AgentVisualsOptions {
  log?: (entry: AgentEvent) => void;
  linger?: number;
  name?: string;
  sync?: boolean;
  spotlight?: boolean | SpotlightOptions;
  yieldToUser?: boolean | YieldOptions;
}

interface AgentVisuals {
  setSpotlight(spotlight: boolean | SpotlightOptions): void;
  setYieldToUser(value: boolean | YieldOptions): void;
  destroy(): void;
}

interface SpotlightOptions {
  blur?: number;
  dim?: number;
  padding?: number;
}

interface YieldOptions {
  moveThreshold?: number;
  resumeAfter?: number;
  ignore?: string;
}
```

## Options

`AgentVisualsOptions`:

| Name | Type | Default | Description |
|---|---|---|---|
| `log` | `(entry: AgentEvent) => void` | — | Receives one entry per lifecycle step: the same events [`onAgentEvent`](./on-agent-event.md) delivers. |
| `linger` | `number` | `1200` | How long the cursor stays after a tool finishes, in ms. |
| `name` | `string` | `""` | Name shown in a tag beside the cursor. Empty shows no tag. |
| `sync` | `boolean` | `true` | Hold the agent's field values and submit until the cursor reaches them, so the page reacts at the cursor's click. `false` animates after the fact without touching the form. |
| `spotlight` | `boolean \| SpotlightOptions` | `false` | Blur and dim the page except the tool the cursor is working in. |
| `yieldToUser` | `boolean \| YieldOptions` | `true` | Hide the cursor when a person moves the mouse, clicks, scrolls, touches or types; the running tool then finishes without waiting for animations. `false` turns it off. |

`SpotlightOptions`:

| Name | Type | Default | Description |
|---|---|---|---|
| `blur` | `number` | `4` | Blur radius for the rest of the page, px. |
| `dim` | `number` | `0.08` | Darkening over the rest of the page, 0–1. |
| `padding` | `number` | `12` | Clear space around the focused element, px. |

`YieldOptions`:

| Name | Type | Default | Description |
|---|---|---|---|
| `moveThreshold` | `number` | `6` | Pointer travel (px) that counts as the user moving. Ignores sensor jitter. |
| `resumeAfter` | `number` | `800` | Quiet time (ms) after the user's last input before the cursor may appear again. |
| `ignore` | `string` | `"[data-web-agents-ui]"` | Input inside an element matching this selector never yields. See [`UI_HOST_ATTR`](./ui-host-attr.md). |

## Returns

An `AgentVisuals` handle:

- `setSpotlight(spotlight)`: turn the spotlight on, off, or retune it at runtime.
- `setYieldToUser(value)`: change or turn off yielding at runtime.
- `destroy()`: release this handle. Idempotent. The last release removes every node, listener and timer, and restores `document.modelContext.registerTool`.

## Example

```ts
// main.tsx, before the app renders
import { installAgentVisuals, onAgentEvent } from "@web-agents/core";
import "@web-agents/core/cursor.css";

const visuals = installAgentVisuals({
  log: (entry) => console.debug("[agent-visuals]", entry),
  spotlight: { blur: 4, dim: 0.08, padding: 12 },
});

onAgentEvent((e) => console.debug("[agent]", e));

// later, e.g. from a settings switch
visuals.setSpotlight(false);
```

## Notes

- Installs are shared and ref-counted. A second call while the layer is installed reuses it and applies only its `spotlight` and `yieldToUser` options.
- On the server (`typeof document === "undefined"`) it returns a no-op handle. Importing the package never touches the DOM.
- The one contract with tools: the element a tool acts on carries `toolname="<tool name>"`. Declarative forms already have it.
- In `sync` mode, `registerTool` is wrapped at install so an imperative tool's `execute` runs when the cursor presses its element. A tool registered before install, or without a `toolname` element, can't be held. A gated `execute` is never held for more than 2.5 s, and cancelling releases it.
- Imperative tools with no element on screen run at once but still emit `start` and `result` / `error`.
- Only trusted input yields the cursor. The agent's own synthetic `input` / `change` events never do. While the browser waits for a confirmation click, the ring on that button stays.
- Lifecycle events are read from `document.modelContext` when it has `ontoolactivated` / `ontoolcancel` (Chrome 156 and later), otherwise from `window`.
- After teardown, in-flight tools finish without animation: held submits and gated tools run at once.
- Under `prefers-reduced-motion` the cursor snaps and fades.

## See also

- [`onAgentEvent`](./on-agent-event.md)
- [`UI_HOST_ATTR`](./ui-host-attr.md)
- [`@web-agents/core/cursor.css`](./cursor-css.md)
- [`defineWebTool`](./define-web-tool.md)
