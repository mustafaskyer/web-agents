/**
 * remove_from_cart, while the cart drawer is open (`useWebTool(removeFromCart, { enabled })` in
 * hooks/use-cart-drawer-tools.ts). Which button? The one a screen reader calls "Remove Ocean Tee (M)", built from the
 * call.
 */
import { defineWebTool } from "@webmcp-agents/core";
import { cart } from "../../store/cart.ts";
import { cartLineInput } from "./cart-line.ts";

export const removeFromCart = defineWebTool({
  id: "remove_from_cart",
  title: "Remove a cart line",
  description:
    "Remove one line from the cart. Needs: the cart open (open_cart), and the line's slug and size as get_cart or open_cart list them.",
  inputSchema: cartLineInput,
  destructive: true,

  target: ({ slug, variant }) => ({ role: "button", name: `Remove ${cart.labelOf(slug, variant)}` }),

  execute: ({ slug, variant }) => cart.remove(slug, variant),
});
