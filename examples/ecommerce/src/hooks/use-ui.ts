import { useSyncExternalStore } from "react";
import { subscribeUi, type UiApi, uiSnapshot } from "../store/ui";

/**
 * The cart drawer's state (src/store/ui.ts): `{ cartOpen, openCart, closeCart }`, re-rendering when it opens or closes,
 * also when open_cart / close_cart do it.
 */
export function useUi(): UiApi {
  return useSyncExternalStore(subscribeUi, uiSnapshot, uiSnapshot);
}
