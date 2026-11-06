/**
 * Imperative WebMCP tool: clear_cart  (via GoogleChromeLabs/use-webmcp-tool)
 *
 * Pure as well: `execute` only touches the store. The only thing that links
 * it to the visual layer is the `toolname` attribute on the button, which
 * lets the cursor find the element by the tool's unique name.
 */
import { useWebMCP } from "use-webmcp-tool";
import { useCart } from "../store";

export function ClearCartButton() {
  const cart = useCart();

  const { registered } = useWebMCP<Record<string, never>, string>({
    name: "clear_cart",
    description: "Remove every item from the shopping cart",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: false },
    enabled: cart.items.length > 0, // agent only sees it when there is something to clear
    execute: () => cart.clear(),
  });

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
