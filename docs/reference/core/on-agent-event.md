# `onAgentEvent`

Subscribes to everything the visual layer observes, in order: tool starts, field fills, parks, results, errors, cancels, and the cursor yielding to or resuming after the user. Devtools, chat widgets and tests build on it instead of on internals.

```ts
import { onAgentEvent } from "@webmcp-agents/core";
```

## Signature

```ts
function onAgentEvent(listener: (e: AgentEvent) => void): () => void;

type AgentEvent =
  | { type: "start"; tool: string; at: number; args?: unknown }
  | { type: "fill"; tool: string; field: string; value: string | boolean }
  | { type: "park"; tool: string; prompt: string }
  | { type: "result"; tool: string; result: unknown; ms: number }
  | { type: "error"; tool: string; error: string; ms: number }
  | { type: "cancel"; tool: string }
  | { type: "yield"; reason: "pointer" | "keyboard" | "wheel" | "touch" }
  | { type: "resume" };
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `listener` | `(e: AgentEvent) => void` | — | Called for every event. |

`AgentEvent` variants:

| `type` | Fields | When |
|---|---|---|
| `start` | `tool`, `at`, `args?` | A tool run started (first lifecycle signal seen). `at` is `performance.now()`. `args` is what the agent passed, when known (imperative tools; declarative forms only show `fill`s). |
| `fill` | `tool`, `field`, `value` | The agent filled a field of a declarative form. Emitted once the cursor has typed it. |
| `park` | `tool`, `prompt` | The tool is waiting for the user: the browser paused on a submit button, or the page asked them something (see [`waitingForUser`](./waiting-for-user.md)). |
| `result` | `tool`, `result`, `ms` | The tool answered the agent. `ms` is measured from the run's start. |
| `error` | `tool`, `error`, `ms` | The tool failed. |
| `cancel` | `tool` | The call was cancelled. |
| `yield` | `reason` | The user started interacting; the cursor got out of the way. |
| `resume` | — | The user has been quiet long enough for the cursor to show again. |

## Returns

An unsubscribe function.

## Example

```ts
import { onAgentEvent } from "@webmcp-agents/core";

const off = onAgentEvent((e) => {
  if (e.type === "park") showBanner(e.prompt); // e.g. 'Click "Place order" to confirm'
  if (e.type === "result" || e.type === "error" || e.type === "cancel") hideBanner();
});

// later
off();
```

## Notes

- A listener that throws never breaks a tool run: the error is caught and logged with `console.error`.
- The `log` option of [`installAgentVisuals`](./install-agent-visuals.md) receives the same entries.
- Listeners are module-level: subscribing works whether or not the visuals are installed, but most events come from the visual layer. `park` is also emitted by [`waitingForUser`](./waiting-for-user.md) and by confirm-gated tools.

## See also

- [`installAgentVisuals`](./install-agent-visuals.md)
- [`waitingForUser`](./waiting-for-user.md)
