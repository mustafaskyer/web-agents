/**
 * The devtools' state, independent of any UI: the page's tools, every call
 * (run from the panel or by a real agent), and the panel's settings.
 *
 * Sources: `getTools()` on `toolchange`, core's `onAgentEvent` (fills, the
 * confirmation park, results, the user taking over), and its own `runTool`.
 * Snapshots are immutable and serialisable (no DOM references), so React can
 * read them with `useSyncExternalStore` and the TanStack bridge can post them.
 *
 * Limitation: core events carry no call id, so an event belongs to the newest
 * unfinished call of its tool. Two concurrent calls of one tool may mix up.
 */
import {
  type AgentEvent,
  type AgentVisuals,
  errorText,
  executeTool,
  isAbortError,
  type ModelContextToolInfo,
  type ModelContextToolResult,
  onAgentEvent,
  toToolResult,
} from "@web-agents/core";
import { isFailure, NAVIGATED } from "./execute";
import { parseSchema, type SchemaNode } from "./schema";

declare global {
  interface Window {
    /** Set by the devtools: play the agent from the browser console. */
    agent?: {
      run(name: string, args?: Record<string, unknown>): Promise<ModelContextToolResult | undefined>;
      list(): Promise<ModelContextToolInfo[]>;
    };
  }
}

/** A registered tool, as the panel shows it. */
export interface ToolView {
  name: string;
  title?: string;
  description: string;
  /** The parsed input schema (Chrome serialises it to a string). */
  schema: SchemaNode;
  annotations: Record<string, unknown>;
  /** `declarative`: a `<form toolname>`; `imperative`: registered with `registerTool`. */
  kind: "declarative" | "imperative";
  /** Its `toolname` element is in the document, so Locate can find it and the cursor can show it. */
  onScreen: boolean;
  /** A declarative form without `toolautosubmit`: the browser waits for the user's click. */
  confirms: boolean;
}

/** `waiting`: the browser paused for the user's confirmation click. */
export type CallStatus = "running" | "waiting" | "ok" | "error" | "cancelled";

/** One field the agent typed into, `at` in epoch ms. */
export interface CallFill {
  field: string;
  value: string | boolean;
  at: number;
}

/** One tool call. Times are epoch ms. */
export interface CallRecord {
  id: string;
  tool: string;
  /** `devtools`: run from the panel or `window.agent`; `agent`: anything else (a browser agent, the chat widget). */
  origin: "devtools" | "agent";
  /** Known for devtools calls and agents' imperative calls; a declarative form's are only seen through `fills`. */
  args?: unknown;
  fills: CallFill[];
  status: CallStatus;
  startedAt: number;
  endedAt?: number;
  result?: ModelContextToolResult;
  error?: string;
  /** What the user is asked to do while `status` is `waiting`. */
  prompt?: string;
}

/** The user took over (the cursor yielded) or went quiet again. */
export interface TimelineMarker {
  id: string;
  type: "yield" | "resume";
  reason?: string;
  at: number;
}

/** The panel's tabs. */
export type DevtoolsTab = "tools" | "timeline" | "settings";

/** What the user can change in the panel; persisted once changed. */
export interface DevtoolsSettings {
  open: boolean;
  tab: DevtoolsTab;
  dock: "bottom" | "right";
  /** Panel height (bottom dock) or width (right dock), in px. */
  size: number;
  spotlight: boolean;
  yieldToUser: boolean;
}

/** One snapshot of everything the panel shows. Immutable; a new object per change. */
export interface DevtoolsState {
  tools: ToolView[];
  /** Newest first, capped at `maxCalls`. */
  calls: CallRecord[];
  /** Newest first, capped at `maxCalls`. */
  markers: TimelineMarker[];
  settings: DevtoolsSettings;
  /** `document.modelContext` exists. */
  supported: boolean;
  /**
   * Calls an agent started can be cancelled from the page (only the polyfill implements `cancelTool`).
   * The panel's own runs can always be cancelled: they pass a signal to `executeTool`.
   */
  canCancel: boolean;
  /** Spotlight and yield-to-user switches have a visuals controller to drive. */
  hasVisuals: boolean;
}

/** The part of the visuals controller the settings drive. */
export type DevtoolsVisuals = Pick<AgentVisuals, "setSpotlight" | "setYieldToUser">;

/** Options for `createDevtoolsStore`. */
export interface DevtoolsStoreOptions {
  /** The agent cursor to drive from Settings. Default null: the switches are disabled. */
  visuals?: DevtoolsVisuals | null;
  /** localStorage key for settings the user changed. Default "web-agents-devtools". */
  storageKey?: string;
  /** Calls (and markers) kept in the timeline; older ones drop off. Default 200. */
  maxCalls?: number;
  /** Starting settings, below whatever the user saved. Pass `spotlight` matching the visuals you installed. */
  initialSettings?: Partial<DevtoolsSettings>;
  /** Clock in epoch ms. Default Date.now. */
  now?: () => number;
}

/** The devtools state plus its actions. `subscribe` + `getSnapshot` fit `useSyncExternalStore`. */
export interface DevtoolsStore {
  getSnapshot(): DevtoolsState;
  /** Called after every change. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Re-read `getTools()` and which tools are on screen. */
  refreshTools(): void;
  /** Run a tool as the agent would (cursor and all). Resolves with the finished record; never rejects. */
  runTool(name: string, args?: Record<string, unknown>): Promise<CallRecord>;
  /** Cancel a running or waiting call. Only works where `canCancel`. */
  cancel(id: string): void;
  clearCalls(): void;
  /** Scroll the tool's element into view and flash it. False when it isn't on screen. */
  locate(name: string): boolean;
  setSetting<K extends keyof DevtoolsSettings>(key: K, value: DevtoolsSettings[K]): void;
  /** Dock position and size back to defaults. */
  resetLayout(): void;
  /** Stop listening, restore `window.agent`. Calls in flight still settle. Idempotent. */
  destroy(): void;
}

/** Settings before anything is passed or saved. */
export const DEFAULT_SETTINGS: DevtoolsSettings = {
  open: false,
  tab: "tools",
  dock: "bottom",
  size: 320,
  spotlight: false,
  yieldToUser: true,
};

const LOCATE_ATTR = "data-web-agents-locate";
const LOCATE_MS = 900;
const LOCATE_CSS = `
[${LOCATE_ATTR}] { outline: 2px solid var(--agent, #111); outline-offset: 3px; animation: web-agents-locate ${LOCATE_MS}ms ease-out; }
@keyframes web-agents-locate { from { outline-offset: 10px; } }
@media (prefers-reduced-motion: reduce) { [${LOCATE_ATTR}] { animation: none; } }`;

/** Still running, or waiting for the user's click. */
export const isOpen = (c: CallRecord): boolean => c.status === "running" || c.status === "waiting";

/** Drop undefined entries, so `{ spotlight: undefined }` doesn't override a default. */
const definedOnly = <T extends object>(obj: T | undefined): Partial<T> =>
  Object.fromEntries(Object.entries(obj ?? {}).filter(([, v]) => v !== undefined)) as Partial<T>;

function readSaved(key: string): Partial<DevtoolsSettings> {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : {};
    return value && typeof value === "object" ? (value as Partial<DevtoolsSettings>) : {};
  } catch {
    return {}; // storage blocked (private mode, sandboxed iframe) or garbage
  }
}

/**
 * Start collecting tools and calls for the devtools (and set `window.agent`).
 * Without `document` (SSR) it is an inert store. Call `destroy()` when done.
 */
export function createDevtoolsStore({
  visuals = null,
  storageKey = "web-agents-devtools",
  maxCalls = 200,
  initialSettings,
  now = Date.now,
}: DevtoolsStoreOptions = {}): DevtoolsStore {
  const mc = typeof document === "undefined" ? undefined : document.modelContext;
  const saved = typeof document === "undefined" ? {} : readSaved(storageKey);
  let state: DevtoolsState = {
    tools: [],
    calls: [],
    markers: [],
    settings: { ...DEFAULT_SETTINGS, ...definedOnly(initialSettings), ...saved },
    supported: !!mc,
    canCancel: !!mc?.cancelTool,
    hasVisuals: !!visuals,
  };
  const listeners = new Set<() => void>();
  const lifetime = new AbortController();
  let destroyed = false;
  let seq = 0;
  const nextId = (prefix: string): string => `${prefix}${++seq}`;

  const set = (patch: Partial<DevtoolsState>): void => {
    state = { ...state, ...patch };
    if (!destroyed) for (const listener of listeners) listener();
  };

  // ---------- 1. settings ----------
  // Only what the user saved is applied to the cursor; otherwise the app's own visuals options stand.
  // On a later task: a React host is created in a child effect, and the provider's effect that
  // applies its own `spotlight` prop runs after it in the same commit.
  const applySaved = setTimeout(() => {
    if (saved.spotlight !== undefined) visuals?.setSpotlight(saved.spotlight);
    if (saved.yieldToUser !== undefined) visuals?.setYieldToUser(saved.yieldToUser);
  }, 0);

  function setSetting<K extends keyof DevtoolsSettings>(key: K, value: DevtoolsSettings[K]): void {
    if (state.settings[key] === value) return;
    saved[key] = value;
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      /* not persisted; still applied */
    }
    if (key === "spotlight") visuals?.setSpotlight(value as boolean);
    if (key === "yieldToUser") visuals?.setYieldToUser(value as boolean);
    set({ settings: { ...state.settings, [key]: value } });
  }

  function resetLayout(): void {
    for (const key of ["dock", "size"] as const) setSetting(key, DEFAULT_SETTINGS[key]);
  }

  // ---------- 2. tools ----------
  let refreshQueued = false;
  let refreshSeq = 0;
  function refreshTools(): void {
    if (!mc || refreshQueued || destroyed) return;
    // Coalesce: one React commit can register and unregister many tools.
    refreshQueued = true;
    queueMicrotask(async () => {
      refreshQueued = false;
      const mine = ++refreshSeq;
      const infos = await mc.getTools().catch(() => []);
      if (mine !== refreshSeq || destroyed) return; // a newer refresh is on its way
      // One pass over the page instead of two queries per tool. A form wins over other elements of the same name.
      const elements = new Map<string, Element>();
      for (const el of document.querySelectorAll("[toolname]")) {
        const name = el.getAttribute("toolname") ?? "";
        if (!elements.has(name) || el instanceof HTMLFormElement) elements.set(name, el);
      }
      const tools = infos.map((info): ToolView => {
        const el = elements.get(info.name);
        const form = el instanceof HTMLFormElement ? el : null;
        return {
          name: info.name,
          title: info.title,
          description: info.description ?? "",
          schema: parseSchema(info.inputSchema),
          annotations: info.annotations ?? {},
          kind: form ? "declarative" : "imperative",
          onScreen: !!el,
          confirms: !!form && !form.hasAttribute("toolautosubmit"),
        };
      });
      set({ tools: tools.sort((a, b) => a.name.localeCompare(b.name)) });
    });
  }
  mc?.addEventListener("toolchange", refreshTools, { signal: lifetime.signal });
  refreshTools();

  // ---------- 3. calls ----------
  const push = (call: CallRecord): CallRecord => {
    set({ calls: [call, ...state.calls].slice(0, maxCalls) });
    return call;
  };
  const patch = (id: string, change: Partial<CallRecord> | ((c: CallRecord) => Partial<CallRecord>)): void => {
    const i = state.calls.findIndex((c) => c.id === id);
    const c = state.calls[i];
    if (!c) return;
    set({ calls: state.calls.with(i, { ...c, ...(typeof change === "function" ? change(c) : change) }) });
  };
  const latestOpen = (tool: string): CallRecord | undefined => state.calls.find((c) => c.tool === tool && isOpen(c));
  const agentCall = (tool: string, startedAt = now(), args?: unknown): CallRecord =>
    push({ id: nextId("c"), tool, origin: "agent", args, fills: [], status: "running", startedAt });

  /** Devtools calls whose `start` event hasn't arrived yet: that event is theirs, not a new agent call. */
  const awaitingStart = new Map<string, string>();
  const aborts = new Map<string, AbortController>();

  async function runTool(name: string, args: Record<string, unknown> = {}): Promise<CallRecord> {
    const call = push({ id: nextId("c"), tool: name, origin: "devtools", args, fills: [], status: "running", startedAt: now() });
    const controller = new AbortController();
    aborts.set(call.id, controller);
    // Before executeTool: the polyfill announces the tool (→ `start`) inside the call.
    awaitingStart.set(name, call.id);
    let outcome: Partial<CallRecord>;
    try {
      const result = (await executeTool(name, args, { signal: controller.signal })) ?? NAVIGATED;
      outcome = { status: isFailure(result) ? "error" : "ok", result };
    } catch (err) {
      outcome = isAbortError(err) ? { status: "cancelled" } : { status: "error", error: errorText(err) };
    } finally {
      aborts.delete(call.id);
      if (awaitingStart.get(name) === call.id) awaitingStart.delete(name);
    }
    outcome = { ...outcome, endedAt: now(), prompt: undefined };
    patch(call.id, outcome);
    // The record may have dropped off the timeline already (cap, Clear).
    return state.calls.find((c) => c.id === call.id) ?? { ...call, ...outcome };
  }

  function onEvent(e: AgentEvent): void {
    switch (e.type) {
      case "start":
        if (awaitingStart.has(e.tool)) awaitingStart.delete(e.tool);
        else agentCall(e.tool, now(), e.args);
        return;
      case "fill": {
        const call = latestOpen(e.tool) ?? agentCall(e.tool);
        patch(call.id, (c) => ({ fills: [...c.fills, { field: e.field, value: e.value, at: now() }] }));
        return;
      }
      case "park": {
        const call = latestOpen(e.tool) ?? agentCall(e.tool);
        patch(call.id, { status: "waiting", prompt: e.prompt });
        return;
      }
      case "result":
      case "error": {
        const endedAt = now();
        // Native Chrome can submit an autosubmit form without announcing it first: the result is the first signal.
        const call = latestOpen(e.tool) ?? agentCall(e.tool, endedAt - e.ms);
        if (call.origin === "devtools") return; // settled by runTool, with the full result
        if (e.type === "error") {
          patch(call.id, { status: "error", error: e.error, endedAt, prompt: undefined });
        } else {
          const result = toToolResult(e.result);
          patch(call.id, { status: isFailure(result) ? "error" : "ok", result, endedAt, prompt: undefined });
        }
        return;
      }
      case "cancel": {
        const call = latestOpen(e.tool);
        if (call) patch(call.id, { status: "cancelled", endedAt: now(), prompt: undefined });
        return;
      }
      case "yield":
      case "resume": {
        const marker: TimelineMarker = { id: nextId("m"), type: e.type, at: now() };
        if (e.type === "yield") marker.reason = e.reason;
        set({ markers: [marker, ...state.markers].slice(0, maxCalls) });
        return;
      }
    }
  }
  const offEvents = onAgentEvent(onEvent);

  function cancel(id: string): void {
    const call = state.calls.find((c) => c.id === id);
    if (!call || !isOpen(call)) return;
    const controller = aborts.get(id);
    if (controller)
      controller.abort(); // the browser cancels through executeTool's signal
    else mc?.cancelTool?.(call.tool);
  }

  // ---------- 4. locate ----------
  let locateTimer = 0;
  let located: Element | null = null;
  let style: HTMLStyleElement | null = null;
  function locate(name: string): boolean {
    const el = document.querySelector(`[toolname="${CSS.escape(name)}"]`);
    if (!el) return false;
    if (!style) {
      style = document.createElement("style");
      style.textContent = LOCATE_CSS;
      document.head.append(style);
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    located?.removeAttribute(LOCATE_ATTR);
    clearTimeout(locateTimer);
    el.setAttribute(LOCATE_ATTR, "");
    located = el;
    locateTimer = window.setTimeout(() => {
      el.removeAttribute(LOCATE_ATTR);
      located = null;
    }, LOCATE_MS);
    return true;
  }

  // ---------- 5. window.agent (the README's console helper) ----------
  const previousAgent = typeof window === "undefined" ? undefined : window.agent;
  const agentApi: NonNullable<Window["agent"]> = {
    run: (name, args) => runTool(name, args).then((call) => call.result),
    list: async () => (mc ? mc.getTools() : []),
  };
  if (typeof window !== "undefined") window.agent = agentApi;

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refreshTools,
    runTool,
    cancel,
    clearCalls: () => set({ calls: state.calls.filter(isOpen), markers: [] }),
    locate,
    setSetting,
    resetLayout,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      lifetime.abort();
      offEvents();
      clearTimeout(applySaved);
      clearTimeout(locateTimer);
      located?.removeAttribute(LOCATE_ATTR);
      style?.remove();
      if (typeof window !== "undefined" && window.agent === agentApi) window.agent = previousAgent;
    },
  };
}
