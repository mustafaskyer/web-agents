---
description: "An optional bridge to TanStack Devtools' event bus, so other TanStack panels (or your own) can follow tool calls."
---

# `webAgentsEventClient`

An optional bridge to TanStack Devtools' event bus, so other TanStack panels (or your own) can follow tool calls. `bridgeStoreToEventClient` posts a devtools store's tools and calls and forwards every agent event.

## Import

```ts
import { bridgeStoreToEventClient, webAgentsEventClient } from "@webmcp-agents/devtools";
import type { WebAgentsEvents } from "@webmcp-agents/devtools";
```

`EventClient` comes from `@tanstack/devtools-event-client`.

## Example

Listen to agent events on the bus, and bridge a store you made yourself.

<include meta='title="src/agent-events.ts"'>/_examples/shared/reference/devtools/event-client.ts</include>

## Options

`bridgeStoreToEventClient(store, client?)`. `webAgentsEventClient` is the shared client (plugin id `web-agents`) and takes none.

| Name | Type | Default | Description |
|---|---|---|---|
| `store` | `DevtoolsStore` | required | The store whose tools and calls are posted. |
| `client` | `EventClient<WebAgentsEvents>` | `webAgentsEventClient` | The client to emit on. Pass your own to post somewhere else. |

### Events

`WebAgentsEvents` names what is posted. Names are bare here; the bus prefixes them with the plugin id.

| Name on the bus | Payload | When |
|---|---|---|
| `web-agents:state` | `{ tools, calls }` from the store's snapshot | Once on bridge, then at most once a frame after a change, and only when `tools` or `calls` changed identity. |
| `web-agents:agent-event` | `AgentEvent` from core's `onAgentEvent` | Every agent event (`start`, `fill`, `park`, `result`, `error`, `cancel`, `yield`, `resume`). |

## Returns

`bridgeStoreToEventClient` returns a disposer that cancels a pending frame, unsubscribes from the store and stops forwarding agent events.

## Notes

- Every devtools host ([`installWebAgentsDevtools`](./install-web-agents-devtools.md), [`<WebAgentsDevtools>`](./web-agents-devtools.md), the TanStack plugin) bridges its store automatically unless `eventClient: false`. Call `bridgeStoreToEventClient` yourself only for a store from `createDevtoolsStore`.
- The client is a no-op outside development, like every TanStack event client.
- State is posted at most once per animation frame because snapshots can be large.

## See also

- [`webAgentsDevtoolsPlugin`](./web-agents-devtools-plugin.md)
- [`createDevtoolsStore`](./create-devtools-store.md): `DevtoolsState`
- [`installWebAgentsDevtools`](./install-web-agents-devtools.md): the `eventClient` option
- [`useAgentEvents`](../react/use-agent-events.md), the same events without TanStack
