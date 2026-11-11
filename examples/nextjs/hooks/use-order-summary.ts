"use client";
/** The checkout page's summary: the cart, or the order just placed while the page is still on screen. */
import { useState } from "react";
import type { Order, Totals } from "@/lib/cart-store";
import { type CartRow, cartRows, useCart } from "./use-cart";

/** What the checkout page renders beside the form. */
export interface OrderSummary {
  rows: CartRow[];
  totals: Totals;
  promo: string | null;
  /** Nothing to check out: no lines and no order placed here. */
  empty: boolean;
  /** The order was placed: the promo form goes away. */
  placed: boolean;
  /** For the checkout form: keep showing this order until the page moves on. */
  onPlaced(order: Order): void;
}

/**
 * Placing the order empties the cart, but the checkout page keeps showing what was bought until the agent has its
 * answer and the router has moved to the cart: so the summary follows the placed order once there is one.
 */
export function useOrderSummary(): OrderSummary {
  const cart = useCart();
  const [placed, setPlaced] = useState<Order | null>(null);
  const { lines, totals, promo } = placed ?? cart;
  return {
    rows: cartRows(lines),
    totals,
    promo,
    empty: lines.length === 0,
    placed: placed !== null,
    onPlaced: setPlaced,
  };
}
