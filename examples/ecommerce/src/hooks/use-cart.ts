import { useSyncExternalStore } from "react";
import { type CartApi, cartSnapshot, subscribeCart } from "../store/cart";

/**
 * The cart (src/store/cart.ts) for a render: its lines, totals, item count, placed orders and actions, re-rendering on
 * every change, whoever made it (the person, or an agent's tool calling the store directly).
 */
export function useCart(): CartApi {
  return useSyncExternalStore(subscribeCart, cartSnapshot, cartSnapshot);
}
