import { useState } from "react";
import { type LineView, lineView } from "../lib/line-view";
import type { Order } from "../store/cart";
import type { Totals } from "../store/cart-rules";
import { useCart } from "./use-cart";
import { useTitle } from "./use-title";

export interface CheckoutPage {
  /** The order summary's lines: the cart's, or the just-placed order's. */
  lines: LineView[];
  totals: Totals;
  promo: string | null;
  /** The order is placed: the page keeps showing it, without the promo form or Remove, until it moves on. */
  placed: boolean;
  /** The checkout form calls this once the order is placed. */
  onPlaced(order: Order): void;
  removePromo(): void;
}

/**
 * /checkout's summary. Placing the order empties the cart, but the page keeps showing that order (no empty-cart state
 * flashes) until the navigation to /order/:id lands.
 */
export function useCheckoutPage(): CheckoutPage {
  const cart = useCart();
  const [placed, setPlaced] = useState<Order | null>(null);
  useTitle("Checkout");
  const { lines, totals, promo } = placed ?? cart;

  return {
    lines: lines.map(lineView),
    totals,
    promo,
    placed: placed !== null,
    onPlaced: setPlaced,
    removePromo: cart.removePromo,
  };
}
