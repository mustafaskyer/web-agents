import { defineWebTool, toModelContextTool } from "@webmcp-agents/core";

const clearCart = defineWebTool({
  id: "clear_cart",
  title: "Clear cart",
  description:
    "Remove every item from the cart. The person confirms on " +
    "the page. Use only when they asked to start over.",
  destructive: true,
  requireConfirmation: true,
  execute: () => "The cart is empty.",
});

// What registerWebTool does for you, by hand: adapt, then register.
document.modelContext?.registerTool(toModelContextTool(clearCart));
