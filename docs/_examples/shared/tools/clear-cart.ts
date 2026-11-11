import { defineWebTool } from "@webmcp-agents/core";

import { cart } from "../lib/cart";

// An agent calls this.
export const clearCart = defineWebTool({
  id: "clear_cart",
  title: "Clear cart",
  description:
    "Empty the cart. Use when the user asks to start over. " +
    "The user confirms on the page.",
  destructive: true,
  requireConfirmation: true,
  execute: () => {
    cart.clear();
    return "The cart is empty.";
  },
});
