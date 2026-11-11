import { defineWebAgent } from "@webmcp-agents/chat/agent";

import { tools } from "./tools";

// Plain data: no DOM, no secrets. The page and your /api/chat route
// both import this file.

export const orders = defineWebAgent({
  id: "orders",
  description:
    "Answers questions about past orders: what was bought, and " +
    "where an order is now.",
  instructions: [
    "list_orders and track_order are on the orders page: " +
      "go_to orders first.",
    "Answer with the order's id, its status and when it arrives.",
  ],
  tools: [tools.goTo, tools.listOrders, tools.trackOrder],

  // A faster model is enough for this narrow job.
  model: "anthropic/claude-sonnet-5-5",
});

export const shopper = defineWebAgent({
  id: "shopper",
  instructions: [
    "You help people shop at Field Store.",
    "Read the cart with get_cart before you change it.",
    "add_to_cart is on a product's page only.",
    "Hand questions about past orders to the orders agent.",
  ],
  tools: [
    tools.getTime,
    tools.getPage,
    tools.goTo,
    tools.getCart,

    // A tool a component owns (useWebTool) goes in by its id.
    "add_to_cart",
    "place_order",
  ],
  agents: [orders],
});

// What your /api/chat route serves: the top-level agents. A
// sub-agent is found through its parent.
export const agents = [shopper];
