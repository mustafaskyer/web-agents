import { useSyncExternalStore } from "react";
import { useWebAgents } from "./context";

const NONE: readonly string[] = [];

/** The catalog tool ids registered with WebMCP right now (sorted). Re-renders only when that set changes. */
export function useEnabledTools(): readonly string[] {
  const { registry } = useWebAgents();
  return useSyncExternalStore(registry.subscribe, registry.enabled, () => NONE);
}
