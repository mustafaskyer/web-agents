/**
 * @webmcp-agents/devtools/react
 *
 *   <WebAgentsDevtools />                               // floating panel, wired to <WebAgentsProvider>'s cursor
 *   <TanStackDevtools plugins={[webAgentsDevtoolsPlugin()]} />   // a "Web Agents" tab in TanStack Devtools
 */
import { deferRelease } from "@webmcp-agents/core";
import { useOptionalWebAgents } from "@webmcp-agents/react";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { type DevtoolsOptions, startDevtools } from "./host";
import type { DevtoolsStore } from "./store";
import { Panel } from "./ui/panel";
import { ShadowHost } from "./ui/shadow-host";

export type { DevtoolsOptions };

/** Props of `<WebAgentsDevtools>`, read once on mount. */
export interface WebAgentsDevtoolsProps extends DevtoolsOptions {}

/**
 * The devtools store for a React host, created on mount and destroyed on
 * unmount. The cursor defaults to the nearest `<WebAgentsProvider>`'s. Options
 * are read once. Destruction waits a macrotask, so StrictMode's remount (and
 * any quick remount) keeps the same store, with its timeline.
 */
export function useDevtoolsStore(options: DevtoolsOptions = {}): DevtoolsStore | null {
  const ctx = useOptionalWebAgents();
  const [initial] = useState(() => ({ ...options, ctx }));
  const [store, setStore] = useState<DevtoolsStore | null>(null);
  const held = useRef<(ReturnType<typeof startDevtools> & { release?: { cancel(): void } }) | null>(null);

  useEffect(() => {
    let current = held.current;
    if (current) {
      current.release?.cancel();
      current.release = undefined;
    } else {
      const { ctx, ...options } = initial;
      // The provider installs its cursor lazily; the saved Settings need it now.
      ctx?.ensureVisuals();
      current = held.current = startDevtools({ ...options, visuals: options.visuals ?? ctx?.visuals ?? null });
    }
    setStore(current.store);
    const mine = current;
    return () => {
      mine.release = deferRelease(() => {
        mine.dispose();
        if (held.current === mine) held.current = null;
      });
    };
  }, [initial]);

  return store;
}

/** The floating devtools panel (launcher bottom-right, Alt+Shift+A). Render it once, inside your provider. */
export function WebAgentsDevtools(props: WebAgentsDevtoolsProps) {
  const store = useDevtoolsStore(props);
  if (!store) return null;
  return (
    <ShadowHost>
      <Panel store={store} hotkey={props.hotkey} />
    </ShadowHost>
  );
}

function PluginPanel(props: DevtoolsOptions) {
  const store = useDevtoolsStore(props);
  if (!store) return null;
  return (
    <ShadowHost inline>
      <Panel store={store} embedded />
    </ShadowHost>
  );
}

/** A TanStack Devtools plugin (structurally a `TanStackDevtoolsReactPlugin`). */
export interface WebAgentsDevtoolsPlugin {
  id: string;
  name: string;
  render: ReactElement;
}

/**
 * The panel as a TanStack Devtools tab: `<TanStackDevtools plugins={[webAgentsDevtoolsPlugin()]} />`.
 * Render TanStackDevtools inside `<WebAgentsProvider>` so Settings can drive the cursor.
 */
export function webAgentsDevtoolsPlugin(options: Omit<DevtoolsOptions, "initialOpen" | "hotkey"> = {}): WebAgentsDevtoolsPlugin {
  return { id: "web-agents", name: "Web Agents", render: <PluginPanel {...options} /> };
}
