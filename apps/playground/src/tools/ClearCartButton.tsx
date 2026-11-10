/**
 * clear_cart: one action, two callers. The person clicks the button; an agent calls the tool. The cursor finds the
 * button by the tool's title ("Clear cart"), parks on it, and `clear` runs only after the person's own click
 * (`requireConfirmation`). On only while there is something to clear.
 */
import { useWebTool } from "@webmcp-agents/react";
import { cart, useCart } from "../store";

export function ClearCartButton() {
  const { items } = useCart();

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
    { enabled: items.length > 0 },
  );

  // A person clicks this.
  return (
    <button type="button" onClick={clear} disabled={items.length === 0}>
      Clear cart
    </button>
  );
}
