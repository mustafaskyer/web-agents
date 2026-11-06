/** What every devtools host does the same way: create the store, bridge it to TanStack's bus, tear both down. */
import { bridgeStoreToEventClient } from "./event-client";
import { createDevtoolsStore, type DevtoolsSettings, type DevtoolsStore, type DevtoolsVisuals } from "./store";

/** Options for `installWebAgentsDevtools`, `<WebAgentsDevtools>` and the TanStack plugin. */
export interface DevtoolsOptions {
  /** The agent cursor to control from Settings (spotlight, yield to the user), e.g. the handle from installAgentVisuals(). */
  visuals?: DevtoolsVisuals | null;
  /** Open the panel on load (unless the user closed it last time). Default false. */
  initialOpen?: boolean;
  /** Starting settings below what the user saved; pass `spotlight` matching the visuals you installed. */
  initialSettings?: Partial<DevtoolsSettings>;
  /** Keyboard shortcut that toggles the panel. Default "Alt+Shift+A"; false for none. */
  hotkey?: string | false;
  /** Post state and agent events to TanStack Devtools' event bus. Default true (a no-op unless TanStack devtools listen). */
  eventClient?: boolean;
}

/** A store wired up for a host, and its teardown. */
export function startDevtools({ visuals = null, initialOpen = false, initialSettings, eventClient = true }: DevtoolsOptions): {
  store: DevtoolsStore;
  dispose(): void;
} {
  const store = createDevtoolsStore({ visuals, initialSettings: { open: initialOpen, ...initialSettings } });
  const unbridge = eventClient ? bridgeStoreToEventClient(store) : () => {};
  return {
    store,
    dispose() {
      unbridge();
      store.destroy();
    },
  };
}
