/**
 * update_cart_item, while the cart drawer is open: hooks/use-cart-drawer-tools.ts turns it on
 * (`useWebTool(updateCartItem, { enabled })`).
 * The cursor goes to that line's quantity field, named after the line ("Quantity of Ocean Tee (M)"): the target is
 * built from the call, so nothing is added to the markup.
 */
import { defineWebTool } from "@webmcp-agents/core";
import { z } from "zod";
import { cart } from "../../store/cart.ts";
import { MAX_QTY } from "../../store/cart-rules.ts";
import { cartLineInput } from "./cart-line.ts";

export const updateCartItem = defineWebTool({
  id: "update_cart_item",
  title: "Change a cart line's quantity",
  description:
    "Set the quantity of one cart line (0 removes it). Needs: the cart open (open_cart), and the line's slug and size as get_cart or open_cart list them.",
  inputSchema: cartLineInput.extend({
    qty: z.number().int().min(0).max(MAX_QTY).describe("The new quantity, e.g. 2"),
  }),
  repeatable: true,

  // the line's quantity field; the new quantity shows there when the cart re-renders
  target: ({ slug, variant }) => ({ role: "spinbutton", name: `Quantity of ${cart.labelOf(slug, variant)}` }),
  fields: { qty: false },

  execute: ({ slug, variant, qty }) => cart.setQty(slug, variant, qty),
});
