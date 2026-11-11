/** get_cart: everywhere. Reads the cart store directly (store/cart.ts), so the provider passes it nothing. */
import { defineWebTool } from "@webmcp-agents/core";
import { money } from "../../lib/money";
import { cart } from "../../store/cart";

export const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description:
    "Read the cart: items, quantities, promo code and totals. Use to answer questions about the cart, or to check it before checkout.",
  readOnly: true,
  execute: () => {
    const { items, promo, totals } = cart.state;
    if (items.length === 0) return promo ? `The cart is empty. Promo ${promo} is applied.` : "The cart is empty.";

    const lines = items.map((i) => `${i.qty} × ${i.name} (${i.sku}): ${money(i.price * i.qty)}`);
    if (promo) lines.push(`Promo ${promo}: −${money(totals.discount)}`);
    lines.push(`Subtotal ${money(totals.subtotal)}, total ${money(totals.total)}.`);
    return lines.join("\n");
  },
});
