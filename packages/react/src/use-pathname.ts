/**
 * The current `location.pathname`, kept fresh by core's URL tracking: the Navigation API where the browser has it,
 * else `history.pushState` / `replaceState` (patched while someone watches), plus back/forward and hash changes.
 * So it follows every client-side router, with nothing wired to it.
 */
import { watchPathname } from "@webmcp-agents/core";
import { useSyncExternalStore } from "react";

const getSnapshot = (): string => location.pathname;
const getServerSnapshot = (): string => "/";

/** The browser's current pathname; `"/"` during server rendering. */
export function usePathname(): string {
  return useSyncExternalStore(watchPathname, getSnapshot, getServerSnapshot);
}
