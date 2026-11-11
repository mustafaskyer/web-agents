/**
 * clear_cart: one action, two callers. The person clicks the button; an agent calls the tool. The cursor finds the
 * button by the tool's title ("Clear cart"), parks on it, and `clear` runs only after the person's own click
 * (`requireConfirmation`). On only while there is something to clear.
 */
import { useWebTool } from "@webmcp-agents/react";
import { useCart } from "../../hooks/use-cart";
import { cart } from "../../store/cart";

/** Registers clear_cart while the cart has items; returns `clear` for the button and whether it can run. */
export function useClearCart(): { clear: () => void; canClear: boolean } {
  const { isEmpty } = useCart();

  const clear = () => cart.clear();

  // An agent calls this.
  useWebTool(
    {
      id: "clear_cart",
      title: "Clear cart",
      description: "Remove every item from the cart. Use only when the user asks to empty it. The user confirms on the page.",
      destructive: true,
      requireConfirmation: true,
      execute: clear,
    },
    { enabled: !isEmpty },
  );

  return { clear, canClear: !isEmpty };
}
