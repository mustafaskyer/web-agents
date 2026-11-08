# `useAgentEvents`

Calls a listener for every agent event (`start`, `fill`, `park`, `result`, `error`, `cancel`, `yield`, `resume`) while the component is mounted. It is the React form of [`onAgentEvent`](../core/on-agent-event.md).

```ts
import { useAgentEvents } from "@web-agents/react";
```

## Signature

```ts
function useAgentEvents(listener: (event: AgentEvent) => void): void;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `listener` | `(event: AgentEvent) => void` | — | Called for each event. The latest render's listener is used, so an inline function is fine. |

`AgentEvent` (from `@web-agents/core`):

| `type` | Fields | When |
|---|---|---|
| `start` | `tool`, `at`, `args?` | A tool run started. `at` is `performance.now()`. `args` when known (imperative tools). |
| `fill` | `tool`, `field`, `value` | The agent filled a field of a declarative form, once the cursor has typed it. |
| `park` | `tool`, `prompt` | The tool is waiting for the user. |
| `result` | `tool`, `result`, `ms` | The tool answered the agent. |
| `error` | `tool`, `error`, `ms` | The tool failed. |
| `cancel` | `tool` | The call was cancelled. |
| `yield` | `reason` | The user started interacting; the cursor got out of the way. |
| `resume` | — | The user was quiet long enough for the cursor to show again. |

## Returns

Nothing.

## Example

From `apps/ecommerce/src/Root.tsx`: a tool that isn't about the cart closes the drawer first, so the agent never works on a page hidden behind it.

```tsx
import { useAgentEvents } from "@web-agents/react";

function CloseDrawerForOtherTools() {
  const { cartOpen, closeCart } = useUi();
  useAgentEvents((e) => {
    if (e.type === "start" && cartOpen && !drawerSafeTools.has(e.tool)) closeCart();
  });
  return null;
}
```

## Notes

- Works without a provider. Most events come from the visual layer, so they only flow while it is installed ([`<WebAgentsProvider>`](./web-agents-provider.md) installs it unless `visuals={false}`). `park` is also emitted by confirm-gated tools and by [`waitingForUser`](../core/waiting-for-user.md).
- It subscribes once on mount and unsubscribes on unmount. Changing the listener never resubscribes.
- A listener that throws is logged and never breaks a tool run.

## See also

- [`onAgentEvent`](../core/on-agent-event.md)
- [`waitingForUser`](../core/waiting-for-user.md) (emits `park`)
- [`installAgentVisuals`](../core/install-agent-visuals.md) (its `log` option gets the same events)
