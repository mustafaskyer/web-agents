---
description: "Calls a listener for every agent event while the component is mounted: the React form of onAgentEvent."
---

# `useAgentEvents`

Calls a listener for every agent event while the component is mounted: the React form of [`onAgentEvent`](../core/on-agent-event.md). Reach for it to show what the agent is doing (a status line, a log) or to react to it (close a drawer before a tool runs).

## Import

```ts
import { useAgentEvents } from "@webmcp-agents/react";
```

## Example

A status line that follows the agent.

<include meta='title="components/agent-status.tsx"'>/_examples/shared/reference/react/use-agent-events.tsx</include>

## Options

`useAgentEvents(listener)`.

| Name | Type | Default | Description |
|---|---|---|---|
| `listener` | `(event: AgentEvent) => void` | required | Called for each event. The latest render's listener is used, so an inline function that closes over state is fine. |

### `AgentEvent`

From `@webmcp-agents/core`. Branch on `type`:

| `type` | Fields | When |
|---|---|---|
| `start` | `tool`, `at`, `args?` | A tool run started. `at` is `performance.now()`. `args` when known (tools from `defineWebTool` / `useWebTool`). |
| `fill` | `tool`, `field`, `value` | The agent's value went into a field (of a declarative form, or the field a tool's parameter is typed into), once the cursor has typed it. |
| `park` | `tool`, `prompt` | The tool is waiting for the person. |
| `result` | `tool`, `result`, `ms` | The tool answered the agent. |
| `error` | `tool`, `error`, `ms` | The tool failed. |
| `cancel` | `tool` | The call was cancelled. |
| `yield` | `reason` | The person started interacting; the cursor got out of the way. |
| `resume` | none | The person was quiet long enough for the cursor to show again. |

## Returns

Nothing.

## Notes

- Works without a provider. Most events come from the visual layer, so they only flow while it is installed ([`<WebAgentsProvider>`](./web-agents-provider.md) installs it unless `visuals={false}`). `park` is also emitted by confirm-gated tools and by [`waitingForUser`](../core/waiting-for-user.md).
- It subscribes once on mount and unsubscribes on unmount. Changing the listener never resubscribes.
- A listener that throws is logged and never breaks a tool run.

## See also

- [Devtools](../../build/devtools.mdx), a timeline built on the same events
- [`onAgentEvent`](../core/on-agent-event.md)
- [`waitingForUser`](../core/waiting-for-user.md) (emits `park`)
- [`installAgentVisuals`](../core/install-agent-visuals.md) (its `log` option gets the same events)
