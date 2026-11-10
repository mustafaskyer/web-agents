import {
  bridgeStoreToEventClient,
  createDevtoolsStore,
  webAgentsEventClient,
} from "@webmcp-agents/devtools";

// Follow every agent event on TanStack Devtools' event bus.
export const stopListening = webAgentsEventClient.on(
  "agent-event",
  (event) => {
    console.log(event.payload.type);
  },
);

// A store you made yourself is not bridged for you.
const store = createDevtoolsStore();
export const stopBridge = bridgeStoreToEventClient(store);
