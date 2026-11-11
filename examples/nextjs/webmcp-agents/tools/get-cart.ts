/** get_cart: everywhere. Reads the cart store directly (lib/cart-store.ts), so it works on any page. */
import { defineWebTool } from "@webmcp-agents/core";
import { cart } from "@/lib/cart-store";

export const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description:
    "Read the cart: lines (slug, variant, quantity, price), promo code and totals. Use to answer questions about the cart or before checkout.",
  readOnly: true,
  execute: () => cart.describe(),
});
