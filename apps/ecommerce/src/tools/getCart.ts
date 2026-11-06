/**
 * Imperative WebTools: get_cart, open_cart (global), close_cart (while the drawer is open)
 *
 * get_cart reads; open_cart shows the drawer, which turns on the drawer's own
 * tools (update_cart_item, remove_from_cart). The cart button in the header
 * carries toolname="open_cart", so the cursor presses it.
 */
import { defineWebTool } from "@web-agents/react";
import { store } from "./context";

export const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description: "List the cart's lines (slug, variant, quantity, price), the promo code and the totals.",
  annotations: { readOnlyHint: true },
  execute: (_input, ctx) => store(ctx).cart.describe(),
});

export const openCart = defineWebTool({
  id: "open_cart",
  title: "Open the cart",
  description: "Open the cart drawer. While it's open, update_cart_item and remove_from_cart are available.",
  annotations: { idempotentHint: true },
  execute: (_input, ctx) => {
    const { ui, cart } = store(ctx);
    if (ui.cartOpen) return "The cart is already open.";
    ui.openCart();
    return `Opened the cart.\n${cart.describe()}`;
  },
});

export const closeCart = defineWebTool({
  id: "close_cart",
  title: "Close the cart",
  description: "Close the cart drawer and go back to the page behind it.",
  annotations: { idempotentHint: true },
  execute: (_input, ctx) => {
    const { ui } = store(ctx);
    if (!ui.cartOpen) return "The cart is already closed.";
    ui.closeCart();
    return "Closed the cart.";
  },
});
