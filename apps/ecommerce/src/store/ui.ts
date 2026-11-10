/**
 * Page chrome state the agent can drive too: the cart drawer. One store for the page, outside React, so `open_cart`
 * (a module-level tool) opens it directly and `useUi()` re-renders whoever shows it.
 */
import { useSyncExternalStore } from "react";

export interface UiApi {
  cartOpen: boolean;
  openCart(): void;
  closeCart(): void;
}

let cartOpen = false;
const listeners = new Set<() => void>();

function setCartOpen(open: boolean): void {
  if (cartOpen === open) return;
  cartOpen = open;
  view = { ...ui, cartOpen };
  for (const listener of listeners) listener();
}

/** The drawer: `ui.cartOpen` is the state now. */
export const ui: UiApi = {
  get cartOpen() {
    return cartOpen;
  },
  openCart: () => setCartOpen(true),
  closeCart: () => setCartOpen(false),
};

let view: UiApi = { ...ui, cartOpen };
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = (): UiApi => view;

/** The drawer's state and actions, re-rendering when it opens or closes. */
export function useUi(): UiApi {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
