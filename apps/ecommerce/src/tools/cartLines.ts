/**
 * Imperative WebTools: update_cart_item, remove_from_cart
 *
 * Component-scoped: CartDrawer enables them only while it's open, so they exist
 * exactly when their controls are on screen. `target` is the drawer's line list:
 * a target is a fixed selector, so the cursor goes to the list, not the row.
 */
import { defineWebTool } from "@web-agents/react";
import { z } from "zod";
import { MAX_QTY } from "../store/cartRules";
import { store } from "./context";

const line = {
  slug: z.string().describe("The line's product slug, as get_cart lists it, e.g. ocean-tee"),
  variant: z.string().optional().describe("The line's variant (size, colour…), needed when the cart has the product in several"),
};

export const updateCartItem = defineWebTool({
  id: "update_cart_item",
  title: "Change a cart line's quantity",
  description: "Set the quantity of a line in the open cart. 0 removes it.",
  inputSchema: z.object({ ...line, qty: z.number().int().min(0).max(MAX_QTY).describe("The new quantity, e.g. 2") }),
  annotations: { idempotentHint: true },
  target: "[data-cart-lines]",
  execute: ({ slug, variant, qty }, ctx) => store(ctx).cart.setQty(slug, variant, qty),
});

export const removeFromCart = defineWebTool({
  id: "remove_from_cart",
  title: "Remove a cart line",
  description: "Remove a line from the open cart.",
  inputSchema: z.object(line),
  annotations: { destructiveHint: true },
  target: "[data-cart-lines]",
  execute: ({ slug, variant }, ctx) => store(ctx).cart.remove(slug, variant),
});
