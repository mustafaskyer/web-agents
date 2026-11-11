/** The cart's "Clear cart" button; its tool, clear_cart (confirm-gated), is `useClearCart` (webmcp-agents/hooks). */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { useClearCart } from "../webmcp-agents/hooks/use-clear-cart";

export function ClearCartButton() {
  const { clear, canClear } = useClearCart();

  // A person clicks this.
  return (
    <Button variant="destructive" size="sm" onClick={clear} disabled={!canClear}>
      Clear cart
    </Button>
  );
}
