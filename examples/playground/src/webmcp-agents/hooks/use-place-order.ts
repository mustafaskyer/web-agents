/**
 * place_order: no input, so no form: a button and a tool that share `place`. It orders whatever is in the cart, with
 * whatever promo code is applied. Placing an order is consequential, so `requireConfirmation`: the cursor parks on
 * "Place order · $…" (found by the tool's title, which the button's text starts with) and the order is placed only
 * by the person's own click. On only while the cart has items: with an empty cart there is nothing to order.
 */
import { useWebTool } from "@webmcp-agents/react";
import { useCart } from "../../hooks/use-cart";
import { cart } from "../../store/cart";

/**
 * Registers place_order while the cart has items; returns `place` for the button, whether there is anything to
 * order (`canPlace`: the button shows only then) and the `total` it would charge.
 */
export function usePlaceOrder(): { place: () => void; canPlace: boolean; total: number } {
  const { isEmpty, totals } = useCart();

  const place = () => cart.placeOrder();

  // An agent calls this.
  useWebTool(
    {
      id: "place_order",
      title: "Place order",
      description:
        "Place the order for everything in the cart, with the applied promo code if any. Needs: items in the cart (an add_to_cart_… tool). The user confirms on the page. Next: list_orders on the Orders page shows it.",
      requireConfirmation: true,
      execute: place,
    },
    { enabled: !isEmpty },
  );

  return { place, canPlace: !isEmpty, total: totals.total };
}
