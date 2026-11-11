import { defineWebTool } from "@webmcp-agents/core";
import { z } from "zod";

export const trackOrder = defineWebTool({
  id: "track_order",
  title: "Track order",
  description:
    "Where an order is: its status and delivery date. On the " +
    "orders pages only: go_to orders first. Take the id from " +
    "list_orders.",
  inputSchema: z.object({
    orderId: z.string().describe("The order's id, e.g. 1002"),
  }),

  readOnly: true,
  // On /orders and on an order's own page, /orders/1002.
  match: ["/orders", "/orders/:id"],

  execute: ({ orderId }) => ({
    orderId,
    status: "shipped",
    arrives: "2026-11-12",
  }),
});
