/**
 * place_order: no input, so no form: a button and a tool that share `place`. It orders whatever is in the cart, with
 * whatever promo code is applied. Placing an order is consequential, so `requireConfirmation`: the cursor parks on
 * "Place order · $…" (found by the tool's title, which the button's text starts with) and the order is placed only
 * by the person's own click. On only while the cart has items: with an empty cart there is nothing to order.
 */
import { useWebTool } from "@webmcp-agents/react";
import { cart, money, useCart } from "../store";

export function PlaceOrderButton() {
  const { items, totals } = useCart();
  const hasItems = items.length > 0;

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
    { enabled: hasItems },
  );

  if (!hasItems) return null;
  // A person clicks this.
  return (
    <div className="checkout-form">
      <button type="button" className="primary" onClick={place}>
        Place order · {money(totals.total)}
      </button>
    </div>
  );
}
