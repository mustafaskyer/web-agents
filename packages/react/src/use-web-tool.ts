/**
 * A tool that lives in a component and closes over its state:
 *
 *   const tool = useMemo(() => defineWebTool({ id: "clear_cart", …, execute: () => cart.clear() }), [cart]);
 *   useWebTool(tool, { enabled: cart.items.length > 0 });
 *
 * Calls always reach the latest render's `execute`, so new state never needs a
 * re-registration. The tool re-registers only when what the agent sees changes
 * (id, title, description, input schema, annotations, confirmation, target).
 * Disabling or unmounting releases it like the registry does: deferred, and
 * after in-flight calls settle (a tool that disables itself, like clear_cart
 * emptying the cart, still answers the agent).
 *
 * Works without a provider; inside one it uses the provider's visuals and `context`.
 */
import {
  type CallTracker,
  createCallTracker,
  deferRelease,
  isWebMCPAvailable,
  RESPONSE_GRACE_MS,
  registerWebTool,
  type WebTool,
  webToolSignature,
} from "@web-agents/core";
import { useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WebAgentsContext } from "./context";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

export interface UseWebToolOptions {
  /** Register only while true. Default true. */
  enabled?: boolean;
}

export interface WebToolState {
  /** The tool is registered with WebMCP. */
  registered: boolean;
  /** The page has `document.modelContext` (native or polyfilled). */
  supported: boolean;
}

interface Registration {
  signature: string;
  calls: CallTracker;
  unregister(): void;
  release?: { cancel(): void };
}

const subscribeNever = (): (() => void) => () => {};
const onServer = (): boolean => false;

/** Register `tool` while the component is mounted (and `enabled`). */
export function useWebTool(tool: WebTool, { enabled = true }: UseWebToolOptions = {}): WebToolState {
  // Only the provider's stable callbacks: its context value also changes with the pathname.
  const agents = useContext(WebAgentsContext);
  const ensureVisuals = agents?.ensureVisuals;
  const getContext = agents?.getContext;
  const supported = useSyncExternalStore(subscribeNever, isWebMCPAvailable, onServer);
  const [registered, setRegistered] = useState(false);
  // Read in render: a bad schema throws here, at the component, not inside an effect.
  const signature = webToolSignature(tool);

  const latest = useRef(tool);
  useIsomorphicLayoutEffect(() => {
    latest.current = tool;
  });

  const registration = useRef<Registration | null>(null);
  // Keyed by the definition signature, not the tool's identity.
  useEffect(() => {
    if (!enabled) return;
    let current = registration.current;
    if (current?.signature === signature) {
      // Same definition (StrictMode remount, re-enable): keep the live registration.
      current.release?.cancel();
      current.release = undefined;
    } else {
      // A new definition replaces the old one at once: Chrome would cancel its calls anyway.
      current?.release?.cancel();
      current?.unregister();
      ensureVisuals?.();
      const calls = createCallTracker();
      const live: WebTool = {
        ...latest.current,
        parse: (input) => latest.current.parse(input),
        execute: (input, ctx) => latest.current.execute(input, ctx),
        run: (input, ctx) => latest.current.run(input, ctx),
      };
      current = { signature, calls, unregister: registerWebTool(live, { calls, context: getContext }) };
      registration.current = current;
    }
    setRegistered(isWebMCPAvailable());
    const mine = current;
    return () => {
      mine.release = deferRelease(
        () => {
          mine.release = undefined;
          mine.unregister();
          if (registration.current !== mine) return;
          registration.current = null;
          setRegistered(false);
        },
        { isBusy: mine.calls.busy, graceMs: RESPONSE_GRACE_MS },
      );
    };
  }, [signature, enabled, ensureVisuals, getContext]);

  return { registered, supported };
}
