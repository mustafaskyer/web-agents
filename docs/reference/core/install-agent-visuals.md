---
description: "Installs the visual layer: a ghost cursor, a focus ring, an optional spotlight and a yield-to-user watcher, all driven by WebMCP lifecycle events."
---

# `installAgentVisuals`

Installs the visual layer: a ghost cursor, a focus ring, an optional spotlight and a yield-to-user watcher, all driven by WebMCP lifecycle events. Call it once, before tools register, so the page shows what the agent does without the tools knowing. [`createWebAgents`](./create-web-agents.md) and `<WebAgentsProvider>` call it for you; use it directly when you register tools yourself.

## Import

```ts
import { installAgentVisuals } from "@webmcp-agents/core";
import type {
  AgentVisuals,
  AgentVisualsOptions,
  SpotlightOptions,
  YieldOptions,
} from "@webmcp-agents/core";
```

Load the stylesheet once beside it: [`@webmcp-agents/core/cursor.css`](./cursor-css.md).

## Example

Install the layer with a tag, a spotlight and tuned yielding, log events, and change a setting later.

<include meta='title="agent-visuals.ts"'>/_examples/shared/reference/core/install-agent-visuals.ts</include>

## Options

`installAgentVisuals(options?)` takes an `AgentVisualsOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `log` | `(entry: AgentEvent) => void` | not said | Receives one entry per lifecycle step: the same events [`onAgentEvent`](./on-agent-event.md) delivers. For a console trace while you build. |
| `linger` | `number` | `1200` | How long the cursor stays after a tool finishes, in ms, so the person can see where it ended. |
| `name` | `string` | `""` | Name shown in a tag beside the cursor (an assistant's name). Empty shows no tag. |
| `sync` | `boolean` | `true` | Hold the agent's field values and submit until the cursor reaches them, so the page reacts at the cursor's click. `false` animates after the fact without touching the form. |
| `spotlight` | `boolean \| SpotlightOptions` | `false` | Blur and dim the page except the tool the cursor is working in. `true` uses the defaults below. |
| `yieldToUser` | `boolean \| YieldOptions` | `true` | Hide the cursor when a person clicks, scrolls, touches or types; the running tool then finishes without waiting for animations. `false` turns it off. |

### `SpotlightOptions`

| Name | Type | Default | Description |
|---|---|---|---|
| `blur` | `number` | `4` | Blur radius for the rest of the page, px. |
| `dim` | `number` | `0.08` | Darkening over the rest of the page, 0 to 1. |
| `padding` | `number` | `12` | Clear space around the focused element, px. |

### `YieldOptions`

| Name | Type | Default | Description |
|---|---|---|---|
| `moveThreshold` | `number` | none | Pointer travel (px, within 150 ms) that counts as the person interacting. By default moving the pointer never yields: only a click, a scroll, a touch or a key does. Set a number (`6` ignores sensor jitter) to hide the cursor the moment the pointer moves. |
| `resumeAfter` | `number` | `800` | Quiet time (ms) after the person's last input before the cursor may appear again. |
| `ignore` | `string` | `"[data-web-agents-ui]"` | Input inside an element matching this selector never yields: a panel the person drives the agent from. See [`UI_HOST_ATTR`](./ui-host-attr.md). |

## Returns

An `AgentVisuals` handle:

| Name | Type | Description |
|---|---|---|
| `setSpotlight(spotlight)` | `(spotlight: boolean \| SpotlightOptions) => void` | Turn the spotlight on, off, or retune it at runtime. |
| `setYieldToUser(value)` | `(value: boolean \| YieldOptions) => void` | Change or turn off yielding at runtime. |
| `destroy()` | `() => void` | Release this handle. Idempotent. The last release removes every node, listener and timer, and restores `document.modelContext.registerTool`. |

## Notes

- Installs are shared and ref-counted. A second call while the layer is installed reuses it and applies only its `spotlight` and `yieldToUser` options.
- On the server (`typeof document === "undefined"`) it returns a no-op handle. Importing the package never touches the DOM.
- Tools do not know about the cursor, and nothing is added to the markup for it. A [`WebTool`](./define-web-tool.md) is found on the page by role and name (its `title`, or its `target`), and its parameters are typed into the fields named or labelled like them; see [Where the cursor goes](./define-web-tool.md#where-the-cursor-goes). A declarative form is found by its `toolname` attribute, and an element marked `toolname="<tool name>"` is still honoured as a tool's control.
- In `sync` mode, `registerTool` is wrapped at install so a tool's `execute` runs when the cursor presses its control (after typing its fields and running its `fill`). A tool registered before install is held too, but a tool with no control cannot be: it runs at once. A gated `execute` is never held for more than 2.5 s per step (2.5 s × (1 + the number of typed fields)), and cancelling releases it. At the timeout the tool writes what the cursor has not and runs.
- Tools with no control on screen run at once but still emit `start` and `result` / `error`. Invalid input answers without the cursor moving.
- Only trusted input yields the cursor. The agent's own synthetic `input` / `change` events never do. While the browser waits for a confirmation click, the ring on that button stays.
- Lifecycle events are read from `document.modelContext` when it has `ontoolactivated` / `ontoolcancel` (Chrome 156 and later), otherwise from `window`.
- After teardown, in-flight tools finish without animation: held submits and gated tools run at once.
- Under `prefers-reduced-motion` the cursor snaps and fades.

## See also

- [The agent cursor](../../concepts/agent-cursor.mdx), how it behaves and why
- [`onAgentEvent`](./on-agent-event.md)
- [`UI_HOST_ATTR`](./ui-host-attr.md)
- [`@webmcp-agents/core/cursor.css`](./cursor-css.md)
- [`defineWebTool`](./define-web-tool.md)
- [`createWebAgents`](./create-web-agents.md), which installs it for you
