/**
 * The playground's app-wide tools, defined once at module level. They read the cart store directly (`cart.state`), so
 * the provider passes them nothing. Where each one is on, from its own definition:
 *
 *   get_cart      everywhere (no `match`)
 *   list_orders   on /orders (`match`)
 *
 * The rest live in the components that own their controls and state (`useWebTool`): add_to_cart_<sku> in each card,
 * clear_cart, place_order and remove_promo in the cart. apply_promo is the one declarative form.
 */
import { defineWebTool } from "@webmcp-agents/react";
import { z } from "zod";
import { cart, money } from "../store";

export const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description:
    "Read the cart: items, quantities, promo code and totals. Use to answer questions about the cart, or to check it before checkout.",
  readOnly: true,
  execute: () => {
    const { items, promo, totals } = cart.state;
    if (items.length === 0) return promo ? `The cart is empty. Promo ${promo} is applied.` : "The cart is empty.";
    const lines = items.map((i) => `${i.qty} × ${i.name} (${i.sku}): ${money(i.price * i.qty)}`);
    if (promo) lines.push(`Promo ${promo}: −${money(totals.discount)}`);
    lines.push(`Subtotal ${money(totals.subtotal)}, total ${money(totals.total)}.`);
    return lines.join("\n");
  },
});

export const listOrders = defineWebTool({
  id: "list_orders",
  title: "List past orders",
  description: "List the orders placed in this session, newest first. Use for questions about past orders (after place_order).",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).optional().describe("How many orders to return, e.g. 5. Default: all."),
  }),
  readOnly: true,
  match: "/orders",
  execute: ({ limit }) => {
    const orders = cart.state.orders.toReversed().slice(0, limit);
    if (orders.length === 0) return "No orders yet.";
    return orders.map((o) => ({
      id: o.id,
      total: money(o.total),
      promo: o.promo,
      items: o.items.map((i) => `${i.qty} × ${i.name}`),
    }));
  },
});

export const tools = { getCart, listOrders };
