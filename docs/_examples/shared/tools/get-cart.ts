import { defineWebTool } from "@webmcp-agents/core";

import { cart } from "../lib/cart";

export const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description:
    "Read the cart: its lines and total. Use before checkout, or " +
    "when the user asks what is in it.",
  readOnly: true,
  execute: () => cart.describe(),
});
