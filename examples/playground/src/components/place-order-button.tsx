/**
 * "Place order · $…", shown while the cart has items. Its tool, place_order (confirm-gated), is `usePlaceOrder`
 * (webmcp-agents/hooks): the cursor parks here and the order is placed by the person's own click.
 */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { money } from "../lib/money";
import { usePlaceOrder } from "../webmcp-agents/hooks/use-place-order";

export function PlaceOrderButton() {
  const { place, canPlace, total } = usePlaceOrder();

  if (!canPlace) return null;

  // A person clicks this.
  return (
    <Button size="lg" className="w-full" onClick={place}>
      Place order · {money(total)}
    </Button>
  );
}
