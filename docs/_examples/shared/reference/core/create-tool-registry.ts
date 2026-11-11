import {
  createToolRegistry,
  defineWebTool,
  installAgentVisuals,
} from "@webmcp-agents/core";

const getCart = defineWebTool({
  id: "get_cart",
  description: "Read the cart.",
  readOnly: true,
  execute: () => ({ items: 2 }),
});

const placeOrder = defineWebTool({
  id: "place_order",
  description: "Place the order. Only on the checkout page.",
  requireConfirmation: true,
  execute: () => "Order placed.",
});

let installed = false;

export const registry = createToolRegistry([getCart, placeOrder], {
  // The cursor must be installed before a tool registers.
  beforeRegister: () => {
    if (installed) return;
    installed = true;
    installAgentVisuals();
  },
});

// Held by the app shell for as long as it is mounted.
export const releaseCart = registry.enable(["get_cart"]);

// Held by the checkout screen: call the disposer when it leaves.
export const releaseCheckout = registry.enable(["place_order"]);

registry.subscribe(() => console.debug(registry.enabled()));
