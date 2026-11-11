/**
 * @webmcp-agents/devtools/react
 *
 *   <WebAgentsProvider devtools={false}> … <WebAgentsDevtools /> …   // the panel where you render it
 *   <TanStackDevtools plugins={[webAgentsDevtoolsPlugin()]} />          // a "Web Agents" tab in TanStack Devtools
 *
 * `<WebAgentsProvider>` already installs the floating panel in development; these are for placing it yourself.
 * The cursor they drive is the started provider's (core's `currentAgentVisuals()`), so this entry needs nothing
 * from `@webmcp-agents/react`, which depends on this package.
 */
import { deferRelease } from "@webmcp-agents/core";
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
 * unmount. The cursor defaults to the started `<WebAgentsProvider>`'s (its
 * layout effect starts it before this effect runs). Options are read once.
 * Destruction waits a macrotask, so StrictMode's remount (and any quick
 * remount) keeps the same store, with its timeline.
 */
export function useDevtoolsStore(options: DevtoolsOptions = {}): DevtoolsStore | null {
  const [initial] = useState(() => ({ ...options }));
  const [store, setStore] = useState<DevtoolsStore | null>(null);
  const held = useRef<(ReturnType<typeof startDevtools> & { release?: { cancel(): void } }) | null>(null);

  useEffect(() => {
    let current = held.current;
    if (current) {
      current.release?.cancel();
      current.release = undefined;
    } else {
      current = held.current = startDevtools(initial);
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

/**
 * The floating devtools panel (launcher bottom-right, Alt+Shift+A). `<WebAgentsProvider>` installs one in development
 * already: render this inside a provider with `devtools={false}`, to choose where and when it shows (production too).
 */
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
 * Render TanStackDevtools inside `<WebAgentsProvider devtools={false}>` so Settings can drive its cursor and the
 * floating panel does not show as well.
 */
export function webAgentsDevtoolsPlugin(options: Omit<DevtoolsOptions, "initialOpen" | "hotkey"> = {}): WebAgentsDevtoolsPlugin {
  return { id: "web-agents", name: "Web Agents", render: <PluginPanel {...options} /> };
}
