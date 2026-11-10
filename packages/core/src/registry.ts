/**
 * Which catalog tools the agent sees right now. Every part of the app that
 * wants a tool on (a route, a mounted component, the app shell) enables it and
 * gets a disposer; a tool stays registered while anyone holds it.
 *
 * Releases are deferred (see deferred.ts): a disable followed by an enable in
 * the same tick (React StrictMode, a route swap that keeps a tool) never
 * touches WebMCP, and a tool with a call in flight stays registered until the
 * call settles and the agent has its answer.
 */
import { type CallTracker, createCallTracker, deferRelease, RESPONSE_GRACE_MS } from "./deferred";
import { isDev, registerWebTool, type WebTool, webToolSignature as signatureOf } from "./web-tool";

export interface ToolRegistryOptions {
  /** Called before each WebMCP registration: install the visuals here so they can gate the tool (installing is idempotent). */
  beforeRegister?: () => void;
  /** Read on every call and passed to execute as `ctx.context`. */
  context?: () => unknown;
}

export interface ToolRegistry {
  /** Enable tools by id (ref-counted). Ids not in the catalog warn, and register if a later `update` adds them. The disposer releases them once every holder has, after in-flight calls settle. Idempotent. */
  enable(names: readonly string[]): () => void;
  /** Swap in a new catalog. Only tools whose definition changed re-register; tools that left are released. */
  update(catalog: readonly WebTool[]): void;
  /** Ids registered with WebMCP right now, sorted. Same array until it changes. */
  enabled(): readonly string[];
  /** Called whenever `enabled()` changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Unregister everything now and stop. */
  destroy(): void;
}

interface Entry {
  holders: number;
  /** Unregisters the live WebMCP registration. */
  unregister?: () => void;
  /** The definition signature it was registered with. */
  signature?: string;
  release?: { cancel(): void };
  calls: CallTracker;
}

function indexCatalog(catalog: readonly WebTool[]): Map<string, WebTool> {
  const byId = new Map<string, WebTool>();
  for (const tool of catalog) {
    if (byId.has(tool.id)) throw new Error(`Duplicate WebTool id "${tool.id}" in catalog`);
    byId.set(tool.id, tool);
  }
  return byId;
}

export function createToolRegistry(catalog: readonly WebTool[], { beforeRegister, context }: ToolRegistryOptions = {}): ToolRegistry {
  let byId = indexCatalog(catalog);
  const entries = new Map<string, Entry>();
  const listeners = new Set<() => void>();
  let snapshot: readonly string[] = [];
  let destroyed = false;

  const notify = (): void => {
    const next = [...entries]
      .filter(([, e]) => e.unregister)
      .map(([id]) => id)
      .sort();
    if (next.length === snapshot.length && next.every((id, i) => id === snapshot[i])) return;
    snapshot = next;
    for (const listener of listeners) listener();
  };

  const entryOf = (id: string): Entry => {
    let entry = entries.get(id);
    if (!entry) {
      entry = { holders: 0, calls: createCallTracker() };
      entries.set(id, entry);
    }
    return entry;
  };

  const register = (id: string, entry: Entry): void => {
    const tool = byId.get(id);
    if (!tool) return;
    beforeRegister?.();
    // Calls go to whatever definition the catalog holds now, so a new `execute` needs no re-registration.
    entry.unregister = registerWebTool(() => byId.get(id) ?? tool, { context, calls: entry.calls });
    entry.signature = signatureOf(tool);
  };

  const unregisterNow = (entry: Entry): void => {
    entry.release?.cancel();
    entry.release = undefined;
    entry.unregister?.();
    entry.unregister = undefined;
    entry.signature = undefined;
  };

  /** Release a tool once its calls are done; a re-enable before then cancels it. */
  const releaseLater = (id: string, entry: Entry): void => {
    if (!entry.unregister) {
      if (entry.holders === 0) entries.delete(id);
      return;
    }
    if (entry.release) return;
    entry.release = deferRelease(
      () => {
        entry.release = undefined;
        unregisterNow(entry);
        if (entry.holders === 0) entries.delete(id);
        notify();
      },
      { isBusy: entry.calls.busy, graceMs: RESPONSE_GRACE_MS },
    );
  };

  return {
    enable(names) {
      if (destroyed) return () => {};
      const held: string[] = [];
      for (const id of names) {
        // Still held: an `update` that adds the id registers it.
        if (!byId.has(id) && isDev())
          console.warn(`[web-agents] Unknown tool "${id}". Catalog: ${[...byId.keys()].join(", ") || "(empty)"}`);
        const entry = entryOf(id);
        entry.holders++;
        held.push(id);
        entry.release?.cancel();
        entry.release = undefined;
        if (!entry.unregister) register(id, entry);
      }
      notify();
      let disposed = false;
      return () => {
        if (disposed || destroyed) return;
        disposed = true;
        for (const id of held) {
          const entry = entries.get(id);
          if (!entry || --entry.holders > 0) continue;
          releaseLater(id, entry);
        }
      };
    },

    update(next) {
      if (destroyed) return;
      byId = indexCatalog(next);
      for (const [id, entry] of entries) {
        const tool = byId.get(id);
        if (!tool) {
          releaseLater(id, entry);
        } else if (entry.holders > 0) {
          entry.release?.cancel(); // back in the catalog before its release ran
          entry.release = undefined;
          if (entry.unregister && entry.signature === signatureOf(tool)) continue;
          // Changed definition: Chrome would cancel its calls anyway, so swap it now.
          unregisterNow(entry);
          register(id, entry);
        }
      }
      notify();
    },

    enabled: () => snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const entry of entries.values()) unregisterNow(entry);
      entries.clear();
      notify();
      listeners.clear();
    },
  };
}
