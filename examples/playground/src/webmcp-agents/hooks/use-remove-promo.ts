/**
 * remove_promo: on while the applied code (and its Remove button) is shown, because the button's component calls this
 * hook. The cursor finds the button by its name, "Remove promo 123", which starts with the tool's title.
 */
import { useWebTool } from "@webmcp-agents/react";
import { cart } from "../../store/cart";

/** Registers remove_promo for as long as the caller is mounted; returns `remove` for the button. */
export function useRemovePromo(): { remove: () => void } {
  const remove = () => cart.removePromo();

  // An agent calls this.
  useWebTool({
    id: "remove_promo",
    title: "Remove promo",
    description: "Take the applied promo code off the cart. Use when the user asks to drop it.",
    execute: remove,
  });

  return { remove };
}
