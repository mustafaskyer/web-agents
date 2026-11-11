"use client";
/** The cart page's logic: the lines, the total, and the order `?placed=` names (where checkout lands). */
import { useSearchParams } from "next/navigation";
import type { Order } from "@/lib/cart-store";
import { type CartRow, cartRows, useCart } from "./use-cart";

/** What the cart page renders. */
export interface CartPage {
  rows: CartRow[];
  /** Cents. */
  total: number;
  /** The order just placed (`?placed=<id>`), shown above the (now empty) cart. */
  order: Order | undefined;
  remove(slug: string): void;
}

/**
 * The cart page's state. Reads `?placed=` with `useSearchParams`, so the page wraps its view in `<Suspense>` (the rest
 * stays prerendered).
 */
export function useCartPage(): CartPage {
  const cart = useCart();
  const placed = useSearchParams().get("placed");
  return {
    rows: cartRows(cart.lines),
    total: cart.totals.total,
    order: placed ? cart.orders.find((o) => o.id === placed) : undefined,
    remove: (slug) => {
      cart.remove(slug);
    },
  };
}
