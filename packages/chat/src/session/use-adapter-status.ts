/** An adapter's status as React state: re-renders on `subscribe`, same object while the value is unchanged. */
import { useCallback, useRef, useSyncExternalStore } from "react";
import type { AdapterStatus, AgentAdapter } from "../types";

const READY: AdapterStatus = { state: "ready" };
const noSubscribe = (): (() => void) => () => {};

/** The adapter's current status, updated as it changes (a download progressing, a check finishing). */
export function useAdapterStatus(adapter: AgentAdapter): AdapterStatus {
  const subscribe = useCallback((l: () => void) => (adapter.subscribe ?? noSubscribe)(l), [adapter]);
  // Same value → same object: an adapter may build a fresh status object per call.
  const last = useRef<{ key: string; value: AdapterStatus }>({ key: "", value: READY });
  const read = useCallback((): AdapterStatus => {
    const value = adapter.status?.() ?? READY;
    const key = JSON.stringify(value);
    if (key !== last.current.key) last.current = { key, value };
    return last.current.value;
  }, [adapter]);
  return useSyncExternalStore(subscribe, read, () => READY);
}
