/**
 * Optional bridge to TanStack Devtools' event bus, so other TanStack panels
 * (or your own) can follow tool calls. Event names are bare here; the bus
 * prefixes them with the plugin id (`web-agents:state`). The client no-ops
 * outside development, like every TanStack event client.
 */
import { EventClient } from "@tanstack/devtools-event-client";
import { type AgentEvent, onAgentEvent } from "@webmcp-agents/core";
import type { DevtoolsState, DevtoolsStore } from "./store";

/** What the bridge posts, by event name. */
export interface WebAgentsEvents {
  state: Pick<DevtoolsState, "tools" | "calls">;
  "agent-event": AgentEvent;
}

class WebAgentsEventClient extends EventClient<WebAgentsEvents> {
  constructor() {
    super({ pluginId: "web-agents" });
  }
}

/** The shared client (plugin id `web-agents`). */
export const webAgentsEventClient = new WebAgentsEventClient();

/**
 * Post the store's tools and calls (at most once a frame: states can be large)
 * and forward every agent event. Returns a disposer.
 */
export function bridgeStoreToEventClient(store: DevtoolsStore, client = webAgentsEventClient): () => void {
  let frame = 0;
  let last: Pick<DevtoolsState, "tools" | "calls"> | null = null;
  const post = () => {
    frame = 0;
    const { tools, calls } = store.getSnapshot();
    if (last && last.tools === tools && last.calls === calls) return;
    last = { tools, calls };
    client.emit("state", last);
  };
  const offStore = store.subscribe(() => {
    frame ||= requestAnimationFrame(post);
  });
  const offEvents = onAgentEvent((e) => client.emit("agent-event", e));
  post();
  return () => {
    cancelAnimationFrame(frame);
    offStore();
    offEvents();
  };
}
