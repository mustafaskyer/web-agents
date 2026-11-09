/**
 * Field Store's agents (defineWebAgent): shared by the browser (<AgentChat agent>), the Vite dev plugin and the Vercel
 * route, so the cloud and the on-device assistant follow the same instructions. No DOM, no secrets: this module is
 * imported server-side too.
 *
 * `shopper` finds products and fills the cart; it hands the purchase itself to `checkout`, a sub-agent that only sees
 * the cart and checkout tools (the order is still confirmed by the person's click on the page).
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
    "Answer with what was ordered, the total, and the order reference if there is one.",
  ],
  tools: ["get_cart", "open_cart", "close_cart", "go_to_page", "apply_promo", "checkout"],
  maxSteps: 5,
});

export const shopper = defineWebAgent({
  id: "shopper",
  instructions: [
    "Field Store sells apparel (tees, shirts, a hoodie, socks), accessories (a tote bag, hats, a wallet), home goods (mugs, bowls, a candle, a blanket) and digital downloads (wallpapers, photo presets, a font).",
    "To find a product: search_products with one key word, or browse_category. To show one: open_product with its slug.",
    "add_to_cart only exists on a product's page: open_product first. Sizes are S, M, L, XL (\"large\" is L); if the product has sizes and the user didn't say one, ask.",
    "If nothing matches part of the request (a colour that isn't sold), say so and offer the closest product.",
    "The cart: open_cart shows it; while it's open, update_cart_item and remove_from_cart change it.",
    "When the user wants to buy, hand the whole purchase (promo code included) to the checkout agent; it reports back to you.",
  ],
  // checkout and promo codes belong to the checkout agent
  tools: (tools) => tools.filter((t) => t.name !== "checkout" && t.name !== "apply_promo"),
  agents: [checkout],
});
