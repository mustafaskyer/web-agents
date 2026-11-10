import { createWebAgents, defineWebTool } from "@webmcp-agents/core";

const getCart = defineWebTool({
  id: "get_cart",
  description: "Read the cart. Use before checking out.",
  readOnly: true,
  execute: () => ({ items: 2 }),
});

const listOrders = defineWebTool({
  id: "list_orders",
  description: "List past orders. Only on the orders page.",
  readOnly: true,
  match: "/orders",
  execute: () => [{ id: "1002", total: "$128.00" }],
});

const tools = { getCart, listOrders };

// The cursor installs, and each tool registers while its `match`
// fits the URL (get_cart everywhere, list_orders on /orders).
export const agents = createWebAgents({
  tools,
  visuals: { name: "Assistant" },
});

// Only some of them, decided by your own state.
agents.setAvailableTools([tools.getCart]);

// Back to every tool of the catalog.
agents.setAvailableTools(undefined);
