/** get_cart, everywhere: reads the cart store, nothing on screen changes. */
import { defineWebTool } from "@webmcp-agents/core";
import { cart } from "../../store/cart.ts";

export const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description:
    "Read the cart without opening it: lines (slug, size, quantity, price), promo code and totals. Use to answer questions about the cart, or to get a line's slug and size before update_cart_item or remove_from_cart.",
  readOnly: true,
  execute: () => cart.describe(),
});
