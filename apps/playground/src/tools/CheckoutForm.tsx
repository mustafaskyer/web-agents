/**
 * Declarative WebMCP tool: place_order
 *
 * No fields: it orders whatever is in the cart, with whatever promo code
 * `apply_promo` applied. And no `toolautosubmit`: the browser pauses on the
 * submit button (`button:tool-submit-active`) until the user clicks it. That
 * pause is the confirm gate for consequential actions, with no custom code.
 *
 * Shown (and registered) only while the cart has items: with an empty cart
 * there is nothing to order, and Chrome would reject the call anyway. Placing
 * the order empties the cart, so the form stays for a moment after answering
 * (see useToolAnswer) instead of vanishing under the agent's pending call.
 */
import type { FormEvent } from "react";
import { money, settle, useCart } from "../store";
import { useToolAnswer } from "@web-agents/react";

export function CheckoutForm() {
  const cart = useCart();
  const { answering, answer } = useToolAnswer();
  const hasItems = cart.items.length > 0;

  if (!hasItems && !answering) return null;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    answer(
      e.nativeEvent as SubmitEvent,
      settle(() => cart.placeOrder()),
    );
  }

  return (
    <form
      toolname="place_order"
      tooldescription="Place the order for everything in the cart, using the applied promo code if any. The user confirms on the page."
      onSubmit={onSubmit}
      className="tool-form checkout-form"
    >
      <button type="submit" className="primary" disabled={!hasItems}>
        {hasItems ? `Place order · ${money(cart.totals.total)}` : "Order placed"}
      </button>
    </form>
  );
}
