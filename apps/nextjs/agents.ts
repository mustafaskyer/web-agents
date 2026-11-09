/**
 * Field Store's agents (defineWebAgent): shared by the client components (<AgentChat agent>, the shadcn chat block) and
 * the route handler, so the model reads the same instructions wherever it runs. No DOM, no secrets.
 */
import { defineWebAgent } from "@webmcp-agents/chat/agent";

export const checkout = defineWebAgent({
  id: "checkout",
  description:
    "Finishes a purchase: reviews the cart, applies a promo code if the user gave one, and places the order (the user confirms on the page).",
  instructions: [
    "You finish purchases at Field Store. Start with get_cart to see what is in the cart and its total.",
    'The checkout page has the checkout form and apply_promo: use go_to_page with "checkout" first if those tools are missing.',
    "Apply a promo code only when the user gave one; never invent a code. Then call checkout with the details you were given; the user confirms the order on the page.",
    "Answer with what was ordered, the total, and the order reference.",
  ],
  tools: ["get_cart", "go_to_page", "apply_promo", "checkout"],
  maxSteps: 5,
});

export const shopper = defineWebAgent({
  id: "shopper",
  instructions: [
    "Field Store sells apparel, accessories, home goods and digital downloads.",
    "To find a product: search_products with one key word. To show one: open_product with its slug.",
    "add_to_cart only exists on a product's page: open_product first. Sizes are S, M, L; if the product has sizes and the user didn't say one, ask.",
    "get_cart reads the cart. When the user wants to buy, hand the whole purchase (promo code included) to the checkout agent; it reports back to you.",
  ],
  tools: (tools) => tools.filter((t) => t.name !== "checkout" && t.name !== "apply_promo"),
  agents: [checkout],
});
