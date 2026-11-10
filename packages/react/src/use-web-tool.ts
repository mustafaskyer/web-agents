/**
 * A tool that lives in a component and closes over its state. The action is one function with two callers:
 *
 *   const clear = () => cart.clear();
 *   useWebTool({ id: "clear_cart", title: "Clear cart", description: "…", requireConfirmation: true, execute: clear });
 *   return <Button onClick={clear}>Clear cart</Button>;
 *
 * Nothing is added to the JSX: the cursor finds the control named like the tool's `title` (see `target`), and
 * types the call's values into the fields named or labelled like its parameters (see `fields`, `fill`).
 *
 * Calls always reach the latest render's `execute`, `target`, `fields` and `fill`, so new state never needs a
 * re-registration. The tool re-registers only when what the agent sees changes (id, title, description, input
 * schema, flags, confirmation, a non-function target). Disabling or unmounting releases it like the registry
 * does: deferred, and after in-flight calls settle (a tool that disables itself, like clear_cart emptying the
 * cart, still answers the agent).
 *
 * Works without a provider; inside one it uses the provider's visuals and `context`. While the provider loads the
 * polyfill (a browser without WebMCP), the tool waits for it and registers once it is there.
 */
import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  type CallTracker,
  createCallTracker,
  defineWebTool,
  deferRelease,
  isWebMCPAvailable,
  RESPONSE_GRACE_MS,
  registerWebTool,
  type WebTool,
  type WebToolConfig,
  webToolSignature,
  whenModelContext,
} from "@webmcp-agents/core";
import { useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WebAgentsContext } from "./context";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

export interface UseWebToolOptions {
  /** Register only while true. Default true. */
  enabled?: boolean;
}

export interface WebToolState<I = unknown, O = unknown> {
  /**
   * Call the tool the way an agent would: the cursor moves, fields are typed, confirmation applies. Resolves to
   * what `execute` returned; rejects when the call fails or the tool is not registered (see `WebTool.invoke`).
   * The same function on every render.
   */
  invoke: WebTool<I, O>["invoke"];
  /** The tool is registered with WebMCP. */
  registered: boolean;
  /** The page has `document.modelContext` (native, or the polyfill once it has loaded). */
  supported: boolean;
}

interface Registration {
  signature: string;
  calls: CallTracker;
  unregister(): void;
  release?: { cancel(): void };
}

/** `supported` changes once, when the polyfill installs `document.modelContext`. */
const subscribeSupport = (onChange: () => void): (() => void) => (isWebMCPAvailable() ? () => {} : whenModelContext(onChange));
const onServer = (): boolean => false;

/**
 * Register a tool while the component is mounted (and `enabled`). Pass the definition itself, as you would to
 * `defineWebTool`, or a tool that is already defined.
 */
export function useWebTool<I, O>(
  tool: WebToolConfig<I, O> & { inputSchema: StandardSchemaV1<unknown, I> },
  options?: UseWebToolOptions,
): WebToolState<I, O>;
export function useWebTool<I = unknown, O = unknown>(
  tool: WebToolConfig<I, O> | WebTool<I, O>,
  options?: UseWebToolOptions,
): WebToolState<I, O>;
export function useWebTool<I, O>(
  definition: WebToolConfig<I, O> | WebTool<I, O>,
  { enabled = true }: UseWebToolOptions = {},
): WebToolState<I, O> {
  // A defined tool is used as it is; a definition is defined on every render (cheap: the schema is only read below).
  const tool = ("kind" in definition ? definition : defineWebTool(definition)) as WebTool;
  // Only the provider's stable callbacks: its context value also changes with the pathname.
  const agents = useContext(WebAgentsContext);
  const ensureVisuals = agents?.ensureVisuals;
  const getContext = agents?.getContext;
  const supported = useSyncExternalStore(subscribeSupport, isWebMCPAvailable, onServer);
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
      // From a function: every call reads the latest render's execute, target, fields and fill.
      current = { signature, calls, unregister: registerWebTool(() => latest.current, { calls, context: getContext }) };
      registration.current = current;
    }
    const mine = current;
    // Registered now, or (the polyfill loading) once it is here: registerWebTool queued it before this listener.
    const stopWaiting = whenModelContext(() => setRegistered(registration.current === mine));
    return () => {
      stopWaiting();
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

  const invoke = useCallback((...args: unknown[]) => (latest.current.invoke as (...args: unknown[]) => Promise<unknown>)(...args), []);
  return { invoke: invoke as WebTool<I, O>["invoke"], registered, supported };
}
