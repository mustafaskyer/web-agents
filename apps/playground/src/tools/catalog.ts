/**
 * The app's WebTool catalog: every tool the agent may see, defined once at
 * module level. Which of them are on at a given moment is decided where they
 * are used (App.tsx):
 *
 *   get_cart      global: always on
 *   list_orders   route-scoped: on at /orders
 *   remove_promo  component-scoped: on while the applied code (and its Remove button) is shown
 *
 * Module-level tools can't close over React state, so they read the cart from
 * `ctx.context` (the provider's `context` prop), typed by the `Register`
 * augmentation below.
 */
import { defineWebTool } from "@webmcp-agents/react";
import { z } from "zod";
import { type CartApi, money } from "../store";

declare module "@webmcp-agents/core" {
  interface Register {
    context: CartApi;
  }
}

/** The provider always passes the cart; fail loudly if someone registers these tools without it. */
function cartOf(context: CartApi | undefined): CartApi {
  if (!context) throw new Error("The cart isn't available: render the tools inside <WebAgentsProvider context={cart}>.");
  return context;
}

export const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description:
    "Read the cart: items, quantities, promo code and totals. Use to answer questions about the cart, or to check it before checkout.",
  annotations: { readOnlyHint: true },
  execute: (_input, ctx) => {
    const cart = cartOf(ctx.context);
    if (cart.items.length === 0) return cart.promo ? `The cart is empty. Promo ${cart.promo} is applied.` : "The cart is empty.";
    const lines = cart.items.map((i) => `${i.qty} × ${i.name} (${i.sku}): ${money(i.price * i.qty)}`);
    const { subtotal, discount, total } = cart.totals;
    if (cart.promo) lines.push(`Promo ${cart.promo}: −${money(discount)}`);
    lines.push(`Subtotal ${money(subtotal)}, total ${money(total)}.`);
    return lines.join("\n");
  },
});

export const removePromo = defineWebTool({
  id: "remove_promo",
  title: "Remove the promo code",
  description: "Take the applied promo code off the cart. Use when the user asks to drop it.",
  execute: (_input, ctx) => cartOf(ctx.context).removePromo(),
});

export const listOrders = defineWebTool({
  id: "list_orders",
  title: "List past orders",
  description: "List the orders placed in this session, newest first. Use for questions about past orders (after checkout).",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).optional().describe("How many orders to return, e.g. 5. Default: all."),
  }),
  annotations: { readOnlyHint: true },
  execute: ({ limit }, ctx) => {
    const orders = cartOf(ctx.context).orders.toReversed().slice(0, limit);
    if (orders.length === 0) return "No orders yet.";
    return orders.map((o) => ({
      id: o.id,
      total: money(o.total),
      promo: o.promo,
      items: o.items.map((i) => `${i.qty} × ${i.name}`),
    }));
  },
});

export const catalog = [getCart, removePromo, listOrders];
