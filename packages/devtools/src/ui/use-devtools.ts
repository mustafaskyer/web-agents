import { useSyncExternalStore } from "react";
import type { DevtoolsState, DevtoolsStore } from "../store";

/**
 * A slice of the devtools state. Select a field (`s => s.calls`), a record in
 * it, or a primitive (`s => s.calls.length`), never a new array or object:
 * the component re-renders only when the selected value changes identity.
 */
export function useDevtools<T>(store: DevtoolsStore, select: (state: DevtoolsState) => T): T {
  const read = () => select(store.getSnapshot());
  return useSyncExternalStore(store.subscribe, read, read);
}
