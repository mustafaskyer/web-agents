# `webAgentsEventClient`

An optional bridge to TanStack Devtools' event bus, so other TanStack panels (or your own) can follow tool calls.
`bridgeStoreToEventClient` posts a devtools store's tools and calls, and forwards every agent event.

```ts
import { bridgeStoreToEventClient, webAgentsEventClient } from "@web-agents/devtools";
import type { WebAgentsEvents } from "@web-agents/devtools";
```

## Signature

```ts
/** The shared client (plugin id `web-agents`). */
const webAgentsEventClient: EventClient<WebAgentsEvents>;

function bridgeStoreToEventClient(store: DevtoolsStore, client?: EventClient<WebAgentsEvents>): () => void;

interface WebAgentsEvents {
  state: Pick<DevtoolsState, "tools" | "calls">;
  "agent-event": AgentEvent;
}
```

`EventClient` comes from `@tanstack/devtools-event-client`.

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `store` | `DevtoolsStore` | — | The store whose tools and calls are posted. |
| `client` | `EventClient<WebAgentsEvents>` | `webAgentsEventClient` | The client to emit on. |

## Returns

A disposer that cancels a pending frame, unsubscribes from the store and stops forwarding agent events.

## Events

| Name on the bus | Payload | When |
|---|---|---|
| `web-agents:state` | `{ tools, calls }` from the store's snapshot | Once on bridge, then at most once a frame after a change, and only when `tools` or `calls` changed identity. |
| `web-agents:agent-event` | `AgentEvent` from core's `onAgentEvent` | Every agent event (`start`, `fill`, `park`, `result`, `error`, `cancel`, `yield`, `resume`). |

Event names are bare in `WebAgentsEvents`; the bus prefixes them with the plugin id.

## Example

```ts
import { webAgentsEventClient } from "@web-agents/devtools";

const off = webAgentsEventClient.on("agent-event", (e) => {
  console.log(e.payload.type, e.payload.tool);
});
```

## Notes

- Every devtools host (`installWebAgentsDevtools`, `<WebAgentsDevtools>`, the TanStack plugin) bridges its store
  automatically unless `eventClient: false`. Call `bridgeStoreToEventClient` yourself only for a store from
  `createDevtoolsStore`.
- The client is a no-op outside development, like every TanStack event client.
- State is posted at most once per animation frame because snapshots can be large.

## See also

- [web-agents-devtools-plugin.md](./web-agents-devtools-plugin.md)
- [create-devtools-store.md](./create-devtools-store.md): `DevtoolsState`
- [install-web-agents-devtools.md](./install-web-agents-devtools.md): the `eventClient` option
