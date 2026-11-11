import { defineWebTool, locate } from "@webmcp-agents/core";
import { z } from "zod";

const names: Record<string, string> = { a1: "Ocean Tee" };

// A button by its role and name.
export const remove = locate({
  role: "button",
  name: "Remove Ocean Tee",
});

// A link whose name is a pattern, anywhere on the page.
export const cart = locate({ name: /^Cart, \d+ items?$/ });

// A field, only inside the open drawer.
export const quantity = locate({
  role: "spinbutton",
  name: "Quantity",
  within: "#cart-drawer",
});

// As a tool's `target`: one control per call.
export const removeFromCart = defineWebTool({
  id: "remove_from_cart",
  description: "Remove one line from the cart. Ids: get_cart.",
  inputSchema: z.object({ lineId: z.string() }),
  target: ({ lineId }) => ({
    role: "button",
    name: `Remove ${names[lineId]}`,
  }),
  execute: ({ lineId }) => `Removed ${lineId}.`,
});
