/**
 * The current `location.pathname`, kept fresh without patching `history`.
 *
 * Updates come from the Navigation API's `currententrychange` (which also sees
 * `history.pushState`) and from `popstate`. Browsers without the Navigation API
 * (Firefox < 147, older Safari) only see back/forward here: pass your router's
 * pathname to `<WebAgentsProvider pathname>` instead.
 */
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  const navigation = (globalThis as { navigation?: EventTarget }).navigation;
  navigation?.addEventListener?.("currententrychange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    navigation?.removeEventListener?.("currententrychange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

const getSnapshot = (): string => location.pathname;
const getServerSnapshot = (): string => "/";

/** The browser's current pathname; `"/"` during server rendering. */
export function usePathname(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
