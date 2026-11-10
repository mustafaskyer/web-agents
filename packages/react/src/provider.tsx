/**
 * <WebAgentsProvider>: one place to say which tools the agent sees.
 *
 *   <WebAgentsProvider tools={tools}>
 *   <WebAgentsProvider tools={tools} availableTools={user ? [tools.getCart, tools.listOrders] : [tools.getCart]}>
 *
 * A thin wrapper over core's `createWebAgents`: `tools` is everything the app has, `availableTools` what an agent
 * may use right now (default: all of them), and a tool's own `match` says on which paths it is on. The URL is
 * followed by the library, so the same line works with any router. It installs the agent cursor itself, before
 * the first tool registers, so tools are animated without any ordering rule in the app. Where the browser has no
 * WebMCP it loads the polyfill (`polyfill`, default `"auto"`); the children render at once, on the server too, and
 * their tools register when it is there.
 *
 * Still supported, from before tools carried `match` and closed over their own state: an array catalog whose
 * tools are off until named in `global`, `routes` or by a mounted component (`useEnableTools`, `<EnableTools>`),
 * a `pathname` from the router, and `context`.
 *
 * Everything that would touch WebMCP on unmount is deferred a macrotask (StrictMode's mount → unmount → mount,
 * route swaps) and waits for in-flight calls, so tool definitions don't churn and Chrome doesn't cancel calls.
 */
import {
  type AgentVisualsOptions,
  type AvailableTools,
  createWebAgents,
  type PolyfillOption,
  matchPath,
  type RegisteredContext,
  type WebToolCatalog,
} from "@webmcp-agents/core";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WebAgentsContext, type WebAgentsContextValue } from "./context";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";
import { usePathname } from "./use-pathname";

const NO_TOOLS: WebToolCatalog = {};
const NO_NAMES: readonly string[] = [];
const NO_ROUTES: Readonly<Record<string, readonly string[]>> = {};
const SEP = "\u0000";

export interface WebAgentsProviderProps {
  /**
   * Every tool the app has, as an object: `{ getCart, listOrders }`. All of them are on (each where its `match`
   * fits) unless `availableTools` says otherwise. Define it at module level or memoise it: a new object re-checks
   * every tool (only changed definitions re-register). Two tools with one id throw, naming both keys.
   *
   * An array is the earlier form and keeps its meaning: its tools are off until `global`, `routes`, a mounted
   * component or `availableTools` turns them on.
   */
  tools?: WebToolCatalog;
  /**
   * What an agent may use right now, decided by your own state: tools by reference (`tools.getCart`) or by their
   * key in `tools`. Default: every tool of an object catalog.
   */
  availableTools?: AvailableTools;
  /**
   * Options for the agent cursor, read when it installs (`spotlight` and `yieldToUser` also apply on change).
   * `false` installs nothing: tools still register, without animation. Default `{}`.
   */
  visuals?: AgentVisualsOptions | false;
  /** Earlier form: tool ids enabled on every page. A tool with no `match` in an object catalog needs none of this. */
  global?: readonly string[];
  /**
   * Earlier form: tool ids per route pattern (`/orders`, `/product/:slug`, `/flights/*`, `*`); every matching
   * pattern contributes. Today a tool says this itself, with `match`.
   */
  routes?: Readonly<Record<string, readonly string[]>>;
  /**
   * The path `routes` and the tools' `match` are tested against, when a router's idea of it should win. Default:
   * the browser's URL, followed by the library (the Navigation API, else `history`, plus back/forward and hash changes).
   */
  pathname?: string;
  /** Earlier form: app state handed to every catalog tool's execute as `ctx.context` (type it via the `Register` interface). */
  context?: RegisteredContext;
  /**
   * Where the browser has no `document.modelContext` (Firefox, Safari, Chrome without WebMCP), `"auto"` loads the
   * polyfill, a chunk of its own that browsers with WebMCP never download; the children render meanwhile and their
   * tools register once it is there. In production too, so every visitor gets the tools and the chat. `false` never
   * loads it: tools register only where the browser has WebMCP. Read once, on mount. Default `"auto"`.
   */
  polyfill?: PolyfillOption;
  children?: ReactNode;
}

export function WebAgentsProvider({
  tools = NO_TOOLS,
  availableTools,
  global = NO_NAMES,
  routes = NO_ROUTES,
  pathname,
  visuals = {},
  context,
  polyfill = "auto",
  children,
}: WebAgentsProviderProps) {
  // ---------- 1. context: tools read the latest value when they run ----------
  const contextRef = useRef(context);
  const getContext = useCallback(() => contextRef.current, []);
  useIsomorphicLayoutEffect(() => {
    contextRef.current = context;
  });

  // ---------- 2. the tools: createWebAgents, started by an effect ----------
  // An array catalog is opt-in, as it always was: nothing is on until something names it.
  const available = availableTools ?? (Array.isArray(tools) ? NO_NAMES : undefined);
  // Created during render, so it must do nothing yet: React may throw this render away (StrictMode does, on purpose).
  const [agents] = useState(() =>
    createWebAgents({ tools, availableTools: available, visuals, context: getContext, polyfill, start: false }),
  );

  // Layout effects run before the children's (passive) enables: the cursor is installed and the catalog current by then.
  // `destroy` releases each tool after its call in flight and defers the rest, so StrictMode's remount changes nothing.
  useIsomorphicLayoutEffect(() => {
    agents.start();
    return () => agents.destroy();
  }, [agents]);

  const lastCatalog = useRef(tools);
  useIsomorphicLayoutEffect(() => {
    if (lastCatalog.current === tools) return;
    lastCatalog.current = tools;
    agents.setTools(tools);
  }, [agents, tools]);

  // Keyed by value: an inline `availableTools={[tools.a, tools.b]}` is a new array on every render.
  const availableKey = available?.map((tool) => (typeof tool === "string" ? tool : tool.id)).join(SEP);
  const latestAvailable = useRef(available);
  latestAvailable.current = available;
  // `availableKey` is the dependency that matters; the list itself is read from the ref.
  useIsomorphicLayoutEffect(() => {
    agents.setAvailableTools(latestAvailable.current);
  }, [agents, availableKey]);

  useIsomorphicLayoutEffect(() => {
    agents.setPathname(pathname);
  }, [agents, pathname]);

  // ---------- 3. the cursor's runtime options ----------
  const spotlight = visuals === false ? undefined : visuals.spotlight;
  const yieldToUser = visuals === false ? undefined : visuals.yieldToUser;
  const spotlightKey = JSON.stringify(spotlight);
  const yieldKey = JSON.stringify(yieldToUser);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by value, not by the (usually inline) object
  useEffect(() => {
    if (spotlight !== undefined) agents.visuals.setSpotlight(spotlight);
  }, [spotlightKey]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by value, not by the (usually inline) object
  useEffect(() => {
    if (yieldToUser !== undefined) agents.visuals.setYieldToUser(yieldToUser);
  }, [yieldKey]);

  // ---------- 4. the earlier form: global ∪ matching routes, by id ----------
  const browserPathname = usePathname();
  const current = pathname ?? browserPathname;
  const scoped = new Set(global);
  for (const [pattern, names] of Object.entries(routes)) if (matchPath(pattern, current)) for (const n of names) scoped.add(n);
  const scopedKey = [...scoped].join(SEP);
  useEffect(() => agents.registry.enable(scopedKey ? scopedKey.split(SEP) : NO_NAMES), [agents, scopedKey]);

  const visualsOff = visuals === false;
  const value = useMemo<WebAgentsContextValue>(
    () => ({
      registry: agents.registry,
      visuals: visualsOff ? null : agents.visuals,
      pathname: current,
      getContext,
      ensureVisuals: agents.start,
    }),
    [agents, visualsOff, current, getContext],
  );
  return <WebAgentsContext.Provider value={value}>{children}</WebAgentsContext.Provider>;
}
