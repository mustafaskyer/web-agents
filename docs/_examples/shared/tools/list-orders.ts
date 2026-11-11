import { defineWebTool } from "@webmcp-agents/core";
import { z } from "zod";

const orders = [
  { id: "1002", total: "$128.00", placed: "2026-11-08" },
  { id: "1001", total: "$46.00", placed: "2026-11-02" },
];

export const listOrders = defineWebTool({
  id: "list_orders",
  title: "List orders",
  description:
    "List past orders, newest first. Use for questions about earlier " +
    "orders. Only on the orders page: go there first.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("How many to return, e.g. 5"),
  }),

  readOnly: true,
  match: "/orders",

  execute: ({ limit }) => orders.slice(0, limit ?? orders.length),
});

export const tools = { listOrders };
