/**
 * <WebAgentsProvider>: one place to say which tools the agent sees.
 *
 *   <WebAgentsProvider tools={catalog} global={["get_cart"]} routes={{ "/orders": ["list_orders"] }} context={cart}>
 *
 * Enabled tools = `global` ∪ `routes[matching the pathname]` ∪ whatever
 * mounted components enable (`useEnableTools`, `<EnableTools>`). It installs
 * the agent cursor itself, before the first tool registers, so imperative
 * tools are animated without any ordering rule in the app.
 *
 * Everything that would touch WebMCP on unmount is deferred a macrotask
 * (StrictMode's mount → unmount → mount, route swaps) and waits for in-flight
 * calls, so tool definitions don't churn and Chrome doesn't cancel calls.
 */
import {
  type AgentVisuals,
  type AgentVisualsOptions,
  createToolRegistry,
  deferRelease,
  installAgentVisuals,
  matchPath,
  type RegisteredContext,
  type WebTool,
} from "@web-agents/core";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WebAgentsContext, type WebAgentsContextValue, type WebAgentsVisuals } from "./context";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";
import { usePathname } from "./use-pathname";

const NO_TOOLS: readonly WebTool[] = [];
const NO_NAMES: readonly string[] = [];
const NO_ROUTES: Readonly<Record<string, readonly string[]>> = {};
const SEP = "\u0000";

export interface WebAgentsProviderProps {
  /**
   * Every tool the app may expose. Memoise it or define it at module level:
   * a new array re-checks every tool (only changed definitions re-register).
   */
  tools?: readonly WebTool[];
  /** Tool ids enabled on every page. */
  global?: readonly string[];
  /**
   * Tool ids per route pattern: `/orders`, `/product/:slug`, `/flights/*`, `*`.
   * Every matching pattern contributes.
   */
  routes?: Readonly<Record<string, readonly string[]>>;
  /** The path routes are matched against. Default: `location.pathname`, tracked via the Navigation API and popstate. */
  pathname?: string;
  /**
   * Options for the agent cursor, read when it installs (`spotlight` and `yieldToUser` also apply on change).
   * `false` installs nothing: tools still register, without animation. Default `{}`.
   */
  visuals?: AgentVisualsOptions | false;
  /** App state handed to every catalog tool's execute as `ctx.context` (type it via the `Register` interface). */
  context?: RegisteredContext;
  children?: ReactNode;
}

export function WebAgentsProvider({
  tools = NO_TOOLS,
  global = NO_NAMES,
  routes = NO_ROUTES,
  pathname,
  visuals = {},
  context,
  children,
}: WebAgentsProviderProps) {
  // ---------- 1. visuals: installed once, before the first registration ----------
  const visualsOptions = useRef(visuals);
  const installed = useRef<AgentVisuals | null>(null);
  const ensureVisuals = useCallback(() => {
    const options = visualsOptions.current;
    if (options !== false && !installed.current && typeof document !== "undefined") installed.current = installAgentVisuals(options);
  }, []);
  const [controls] = useState<WebAgentsVisuals>(() => ({
    setSpotlight: (value) => installed.current?.setSpotlight(value),
    setYieldToUser: (value) => installed.current?.setYieldToUser(value),
  }));

  // ---------- 2. context: tools read the latest value when they run ----------
  const contextRef = useRef(context);
  const getContext = useCallback(() => contextRef.current, []);

  // ---------- 3. the registry ----------
  const [registry] = useState(() => createToolRegistry(tools, { beforeRegister: ensureVisuals, context: getContext }));

  useIsomorphicLayoutEffect(() => {
    visualsOptions.current = visuals;
    contextRef.current = context;
  });

  const teardown = useRef<{ cancel(): void } | null>(null);
  useIsomorphicLayoutEffect(() => {
    teardown.current?.cancel();
    teardown.current = null;
    ensureVisuals();
    return () => {
      // Deferred: StrictMode's immediate remount keeps the same layer (and the registerTool wrapper live tools rely on).
      teardown.current = deferRelease(() => {
        teardown.current = null;
        installed.current?.destroy();
        installed.current = null;
      });
    };
  }, [ensureVisuals]);

  const spotlight = visuals === false ? undefined : visuals.spotlight;
  const yieldToUser = visuals === false ? undefined : visuals.yieldToUser;
  const spotlightKey = JSON.stringify(spotlight);
  const yieldKey = JSON.stringify(yieldToUser);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by value, not by the (usually inline) object
  useEffect(() => {
    if (spotlight !== undefined) installed.current?.setSpotlight(spotlight);
  }, [spotlightKey]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by value, not by the (usually inline) object
  useEffect(() => {
    if (yieldToUser !== undefined) installed.current?.setYieldToUser(yieldToUser);
  }, [yieldKey]);

  // Layout effect: runs before children's (passive) enables, so they find tools added in the same render.
  const lastCatalog = useRef(tools);
  useIsomorphicLayoutEffect(() => {
    if (lastCatalog.current === tools) return;
    lastCatalog.current = tools;
    registry.update(tools);
  }, [registry, tools]);

  // ---------- 4. global ∪ matching routes ----------
  const browserPathname = usePathname();
  const current = pathname ?? browserPathname;
  const scoped = new Set(global);
  for (const [pattern, names] of Object.entries(routes)) if (matchPath(pattern, current)) for (const n of names) scoped.add(n);
  const scopedKey = [...scoped].join(SEP);
  useEffect(() => registry.enable(scopedKey ? scopedKey.split(SEP) : NO_NAMES), [registry, scopedKey]);

  const visualsOff = visuals === false;
  const value = useMemo<WebAgentsContextValue>(
    () => ({ registry, visuals: visualsOff ? null : controls, pathname: current, getContext, ensureVisuals }),
    [registry, visualsOff, controls, current, getContext, ensureVisuals],
  );
  return <WebAgentsContext.Provider value={value}>{children}</WebAgentsContext.Provider>;
}
