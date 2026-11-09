/**
 * Imperative WebTool: clear_cart
 *
 * Destructive, so `requireConfirmation`: the agent's call waits until the
 * person clicks this button (the cursor parks on it meanwhile), and that
 * click runs the tool instead of the button's own handler. `useWebTool`
 * keeps calls on the latest `cart`, and only shows the tool to the agent
 * while there is something to clear. The `toolname` attribute is what the
 * cursor and the confirmation look for.
 */
import { defineWebTool, useWebTool } from "@webmcp-agents/react";
import { useMemo } from "react";
import { useCart } from "../store";

export function ClearCartButton() {
  const cart = useCart();

  const tool = useMemo(
    () =>
      defineWebTool({
        id: "clear_cart",
        description: "Remove every item from the cart. Use only when the user asks to empty it. The user confirms on the page.",
        annotations: { destructiveHint: true },
        requireConfirmation: true,
        execute: () => cart.clear(),
      }),
    [cart],
  );
  const { registered } = useWebTool(tool, { enabled: cart.items.length > 0 });

  return (
    <button
      type="button"
      toolname="clear_cart"
      onClick={() => cart.clear()}
      disabled={cart.items.length === 0}
      title={registered ? "Agent-callable" : undefined}
    >
      Clear cart
    </button>
  );
}
