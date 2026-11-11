/**
 * Page chrome state the agent can drive too: the cart drawer. One store for the page, outside React, so `open_cart`
 * (a module-level tool) opens it directly and `useUi()` (src/hooks/use-ui.ts) re-renders whoever shows it.
 */
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

/** Calls `listener` when the drawer opens or closes; returns the unsubscribe. */
export function subscribeUi(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The drawer's state as a render sees it: the same object until it changes. */
export const uiSnapshot = (): UiApi => view;
