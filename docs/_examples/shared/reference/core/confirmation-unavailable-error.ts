import { defineWebTool, WebToolError } from "@webmcp-agents/core";

const placeOrder = defineWebTool({
  id: "place_order",
  title: "Place order",
  description: "Place the order. Needs the person's confirmation.",
  requireConfirmation: true,
  execute: () => "Order placed.",
});

try {
  // Parks on the "Place order" button until the person clicks it.
  await placeOrder.invoke();
} catch (err) {
  // No button on the page: the call failed rather than run
  // unconfirmed. `invoke` rethrows the agent's error code.
  if (err instanceof WebToolError && err.code === "unavailable") {
    console.warn("Open the cart to confirm:", err.message);
  }
}
