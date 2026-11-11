/** list_orders: on /orders only (`match`), the page that shows them. The provider follows the URL by itself. */
import { defineWebTool } from "@webmcp-agents/core";
import { z } from "zod";
import { money } from "../../lib/money";
import { cart } from "../../store/cart";

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
