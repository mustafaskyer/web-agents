/**
 * Turn catalog tools on while a component is mounted: a promo row enables
 * `remove_promo`, a product page enables `add_to_cart`. Ref-counted with every
 * other holder (routes, other components), and released only after in-flight
 * calls settle.
 */
import { useEffect } from "react";
import { useWebAgents } from "./context";

const SEP = "\u0000";

/** Enable these catalog tool ids while the calling component is mounted. */
export function useEnableTools(names: readonly string[]): void {
  const { registry } = useWebAgents();
  // Keyed by value: an inline array literal doesn't re-enable on every render.
  const key = names.join(SEP);
  useEffect(() => registry.enable(key ? key.split(SEP) : []), [registry, key]);
}

/** Component form of `useEnableTools`, for JSX that would rather not call a hook: `<EnableTools names={["remove_promo"]} />`. */
export function EnableTools({ names }: { names: readonly string[] }): null {
  useEnableTools(names);
  return null;
}
