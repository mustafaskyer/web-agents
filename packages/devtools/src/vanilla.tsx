/**
 * installWebAgentsDevtools(): the panel without a React app of your own.
 * React renders it (a peer dependency) into its own root and shadow DOM.
 */
import { createRoot } from "react-dom/client";
import { type DevtoolsOptions, startDevtools } from "./host";
import { Panel } from "./ui/panel";
import { ShadowHost } from "./ui/shadow-host";

export type { DevtoolsOptions };

let installed: (() => void) | null = null;

/**
 * Mount the floating devtools panel (launcher bottom-right, Alt+Shift+A).
 * Returns a disposer. Installing twice returns the first disposer.
 */
export function installWebAgentsDevtools(options: DevtoolsOptions = {}): () => void {
  if (typeof document === "undefined") return () => {};
  if (installed) {
    console.warn("[web-agents] devtools are already installed; returning the existing instance.");
    return installed;
  }
  const devtools = startDevtools(options);
  // The React root lives in a detached container: ShadowHost puts the visible host on <body> itself.
  const root = createRoot(document.createElement("div"));
  root.render(
    <ShadowHost>
      <Panel store={devtools.store} hotkey={options.hotkey} />
    </ShadowHost>,
  );
  const dispose = () => {
    if (installed !== dispose) return;
    installed = null;
    root.unmount();
    devtools.dispose();
  };
  installed = dispose;
  return dispose;
}
