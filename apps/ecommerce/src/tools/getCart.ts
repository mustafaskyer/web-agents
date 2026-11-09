/**
 * Imperative WebTools: get_cart, open_cart (global), close_cart (while the drawer is open)
 *
 * get_cart reads; open_cart shows the drawer, which turns on the drawer's own
 * tools (update_cart_item, remove_from_cart). The cart button in the header
 * carries toolname="open_cart", so the cursor presses it.
 */
import { defineWebTool } from "@webmcp-agents/react";
import { store } from "./context";

export const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description:
    "Read the cart without opening it: lines (slug, size, quantity, price), promo code and totals. Use to answer questions about the cart, or to get a line's slug and size before update_cart_item or remove_from_cart.",
  annotations: { readOnlyHint: true },
  execute: (_input, ctx) => store(ctx).cart.describe(),
});

export const openCart = defineWebTool({
  id: "open_cart",
  title: "Open the cart",
  description:
    "Show the cart drawer to the user and list its lines. Needed first for update_cart_item and remove_from_cart, which only exist while it's open. Next: change a line, close_cart, or go_to_page checkout.",
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
  description: "Close the cart drawer, back to the page behind it. Use when the user is done with the cart. Only while the cart is open.",
  annotations: { idempotentHint: true },
  execute: (_input, ctx) => {
    const { ui } = store(ctx);
    if (!ui.cartOpen) return "The cart is already closed.";
    ui.closeCart();
    return "Closed the cart.";
  },
});
